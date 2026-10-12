"""
Machine Learning Training & Prediction Engine for OBE Early Warning System.

Models:
- Baseline: Logistic Regression (interpretable linear log-odds coefficients)
- Comparison: Random Forest Classifier (non-linear decision trees)
- Selection: Evaluates 5-fold cross-validated F1 score to pick best model
- Storage: Saved via joblib with complete preprocessing pipeline & metadata
"""

import os
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from .synthetic_data import DATA_FILE, generate_synthetic_historical_data

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "obe_attainment_model.joblib")

FEATURE_NAMES = ["early_co_pct", "num_eval_questions", "overall_early_pct", "trend"]


class AttainmentPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.metadata: Dict[str, Any] = {}
        self.is_loaded = False
        os.makedirs(MODEL_DIR, exist_ok=True)
        self.load_or_train_default()

    def load_or_train_default(self):
        """Loads saved model from disk if present, otherwise trains on synthetic data."""
        if os.path.exists(MODEL_PATH):
            try:
                bundle = joblib.load(MODEL_PATH)
                self.model = bundle["model"]
                self.scaler = bundle["scaler"]
                self.metadata = bundle["metadata"]
                self.is_loaded = True
                print(f"Loaded existing ML model: {self.metadata.get('algorithm', 'Unknown')}")
                return
            except Exception as e:
                print(f"Failed loading saved model ({e}), retraining...")

        # Train new model
        self.train_model()

    def train_model(self) -> Dict[str, Any]:
        """
        Trains Logistic Regression and Random Forest models on historical data.
        Selects the best performing model based on 5-fold cross-validated F1 score.
        """
        if not os.path.exists(DATA_FILE):
            print("Historical data not found, generating synthetic dataset...")
            generate_synthetic_historical_data()

        df = pd.read_csv(DATA_FILE)

        # Check data source
        data_source_label = "Synthetic historical dataset (seeded)"
        if "data_source" in df.columns:
            if (df["data_source"] == "real").all():
                data_source_label = "Real institutional historical data"

        X = df[FEATURE_NAMES].fillna(0.0)
        y = df["attained_final"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # 1. Baseline: Logistic Regression
        lr = LogisticRegression(max_iter=1000, random_state=42)
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_f1_lr = float(np.mean(cross_val_score(lr, X_train_scaled, y_train, cv=cv, scoring="f1")))

        # 2. Comparison: Random Forest Classifier
        rf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
        cv_f1_rf = float(np.mean(cross_val_score(rf, X_train, y_train, cv=cv, scoring="f1")))

        # Model Selection: Pick by cross-validated F1 score
        if cv_f1_rf >= cv_f1_lr:
            selected_algorithm = "Random Forest Classifier"
            best_model = rf
            best_model.fit(X_train, y_train)
            y_pred = best_model.predict(X_test)
            use_scaler = False
            raw_importances = best_model.feature_importances_
        else:
            selected_algorithm = "Logistic Regression"
            best_model = lr
            best_model.fit(X_train_scaled, y_train)
            y_pred = best_model.predict(X_test_scaled)
            use_scaler = True
            raw_importances = np.abs(best_model.coef_[0])

        # Normalize feature importance weights for explainability
        importance_sum = float(np.sum(raw_importances)) or 1.0
        normalized_importances = {
            feat: round(float(imp / importance_sum), 3)
            for feat, imp in zip(FEATURE_NAMES, raw_importances)
        }

        # Calculate evaluation metrics on held-out test split
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 3),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 3),
            "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 3),
            "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 3),
            "cv_f1_logistic_regression": round(cv_f1_lr, 3),
            "cv_f1_random_forest": round(cv_f1_rf, 3),
        }

        metadata = {
            "algorithm": selected_algorithm,
            "trained_date": datetime.now(timezone.utc).isoformat(),
            "data_source": data_source_label,
            "training_samples": len(df),
            "metrics": metrics,
            "feature_importances": normalized_importances,
            "uses_scaler": use_scaler,
            "features": FEATURE_NAMES,
            "description": (
                "Predicts probability of a student attaining Course Outcome by final examination "
                "based on continuous early assessment performance signals."
            ),
        }

        # Save to disk
        bundle = {
            "model": best_model,
            "scaler": scaler if use_scaler else None,
            "metadata": metadata,
        }
        joblib.dump(bundle, MODEL_PATH)

        self.model = best_model
        self.scaler = scaler if use_scaler else None
        self.metadata = metadata
        self.is_loaded = True

        print(f"[OK] Model trained & saved: {selected_algorithm} | Test F1: {metrics['f1']}")
        return metadata

    def predict_instance(self, instance: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predicts attainment probability and risk level for a single student-CO pair.
        Gracefully handles missing or NaN features.
        """
        if not self.is_loaded or self.model is None:
            self.train_model()

        # Sanitize and extract features explicitly; never crash on missing keys
        def safe_float(val, default=0.0):
            if val is None:
                return default
            try:
                f = float(val)
                return 0.0 if np.isnan(f) else f
            except (ValueError, TypeError):
                return default

        early_co_pct = safe_float(instance.get("early_co_pct"), 0.0)
        num_eval_questions = int(safe_float(instance.get("num_eval_questions"), 0.0))
        overall_early_pct = safe_float(instance.get("overall_early_pct"), 0.0)
        trend = safe_float(instance.get("trend"), 0.0)

        feature_vector = np.array([[early_co_pct, num_eval_questions, overall_early_pct, trend]])

        if self.metadata.get("uses_scaler") and self.scaler is not None:
            feature_vector_input = self.scaler.transform(feature_vector)
        else:
            feature_vector_input = feature_vector

        # Predict probability of class 1 (Attained)
        probs = self.model.predict_proba(feature_vector_input)[0]
        attainment_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
        attainment_prob = round(attainment_prob, 3)

        # Categorize risk level
        # Probability < 0.45: High risk (likely will NOT attain CO)
        # 0.45 <= Prob < 0.70: Medium risk (borderline)
        # Prob >= 0.70: Low risk (safe)
        if attainment_prob < 0.45:
            risk_level = "high"
        elif attainment_prob < 0.70:
            risk_level = "medium"
        else:
            risk_level = "low"

        predicted_attained = bool(attainment_prob >= 0.50)

        # Explainability: identify top contributing features
        feature_impacts = []
        importances = self.metadata.get("feature_importances", {})

        # Early CO score impact
        co_impact = "negative" if early_co_pct < 45.0 else ("positive" if early_co_pct >= 65.0 else "neutral")
        feature_impacts.append({
            "feature": "early_co_pct",
            "name": "Early Assessment CO Score",
            "value": f"{early_co_pct:.1f}%",
            "importance": importances.get("early_co_pct", 0.4),
            "impact": co_impact,
        })

        # Overall student early performance
        overall_impact = "negative" if overall_early_pct < 45.0 else ("positive" if overall_early_pct >= 65.0 else "neutral")
        feature_impacts.append({
            "feature": "overall_early_pct",
            "name": "Overall Continuous Assessment",
            "value": f"{overall_early_pct:.1f}%",
            "importance": importances.get("overall_early_pct", 0.3),
            "impact": overall_impact,
        })

        # Trend trajectory
        trend_impact = "negative" if trend < -5.0 else ("positive" if trend > 5.0 else "neutral")
        feature_impacts.append({
            "feature": "trend",
            "name": "Assessment Performance Trend",
            "value": f"{'+' if trend > 0 else ''}{trend:.1f}%",
            "importance": importances.get("trend", 0.2),
            "impact": trend_impact,
        })

        # Number of evaluated questions
        eval_impact = "negative" if num_eval_questions <= 1 else "positive"
        feature_impacts.append({
            "feature": "num_eval_questions",
            "name": "Evaluated Question Coverage",
            "value": f"{num_eval_questions} question(s)",
            "importance": importances.get("num_eval_questions", 0.1),
            "impact": eval_impact,
        })

        # Sort features by importance descending
        feature_impacts.sort(key=lambda x: x["importance"], reverse=True)

        return {
            "student_id": instance.get("student_id"),
            "student_name": instance.get("student_name"),
            "roll_no": instance.get("roll_no"),
            "co_id": instance.get("co_id"),
            "co_code": instance.get("co_code"),
            "early_co_pct": early_co_pct,
            "overall_early_pct": overall_early_pct,
            "trend": trend,
            "num_eval_questions": num_eval_questions,
            "attainment_probability": attainment_prob,
            "risk_level": risk_level,
            "predicted_attained": predicted_attained,
            "top_features": feature_impacts,
        }

    def predict_batch(self, instances: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.predict_instance(inst) for inst in instances]

    def get_model_info(self) -> Dict[str, Any]:
        if not self.is_loaded or not self.metadata:
            self.train_model()
        return self.metadata


# Global singleton instance
predictor = AttainmentPredictor()
