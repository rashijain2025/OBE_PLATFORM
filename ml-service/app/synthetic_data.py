"""
Synthetic Historical Dataset Generator for OBE Early Warning Model.

DISCLAIMER:
This dataset is SYNTHETICALLY GENERATED for educational modeling and initial cold-start
evaluation when real multi-year institutional student history does not yet exist.
It simulates realistic student performance correlations across continuous assessments
(quizzes, assignments, mid-terms) with added stochastic noise.

Real institutional data can replace this file at `ml-service/data/synthetic_historical_data.csv`
with zero code changes.
"""

import os
import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DATA_FILE = os.path.join(DATA_DIR, "synthetic_historical_data.csv")


def generate_synthetic_historical_data(n_samples: int = 1500, random_state: int = 42) -> pd.DataFrame:
    """
    Generates synthetic historical student assessment data.
    Features per (student, CO):
    - early_co_pct: early-assessment score % for this specific CO (0 - 100)
    - num_eval_questions: number of evaluated questions mapped to this CO so far (1 - 8)
    - overall_early_pct: student's overall performance % across all early assessments (0 - 100)
    - trend: performance trajectory between assessments (-40 to +40, or 0)
    - target_threshold: institutional attainment bar (e.g. 40 or 50)
    - attained_final: binary target (1 = attained CO at final end-sem, 0 = missed)
    """
    np.random.seed(random_state)
    os.makedirs(DATA_DIR, exist_ok=True)

    courses = ["CS201-DSA", "CS301-DBMS", "CS302-OS", "CS401-CN", "CS402-SE"]
    batches = ["2022-2023", "2023-2024", "2024-2025"]
    co_codes = ["CO1", "CO2", "CO3", "CO4", "CO5"]

    records = []

    for i in range(n_samples):
        course = np.random.choice(courses)
        batch = np.random.choice(batches)
        co = np.random.choice(co_codes)
        student_id = f"STU_{batch[:4]}_{np.random.randint(100, 999)}"

        # Latent student ability factor (normal distribution, centered at 60)
        latent_ability = np.clip(np.random.normal(loc=60, scale=18), 10, 98)

        # Early CO % correlates with latent ability + topic-specific variation
        early_co_pct = np.clip(latent_ability + np.random.normal(loc=0, scale=12), 0.0, 100.0)

        # Number of evaluated questions for this CO in early exams (1 to 6)
        num_eval_questions = int(np.random.choice([1, 2, 3, 4, 5, 6], p=[0.1, 0.25, 0.35, 0.15, 0.1, 0.05]))

        # Overall early score correlates with ability
        overall_early_pct = np.clip(latent_ability + np.random.normal(loc=0, scale=8), 5.0, 100.0)

        # Trend between early assessments (e.g. Midterm % minus Quiz %)
        # 15% of students have 0 trend (only 1 assessment taken so far)
        if np.random.rand() < 0.15:
            trend = 0.0
        else:
            trend = np.clip(np.random.normal(loc=1.5, scale=12), -40.0, 40.0)

        target_threshold = 40.0

        # Realistic logit model for final attainment:
        # Heavily driven by early_co_pct and overall_early_pct, boosted by positive trend
        # logit intercept calibrated so that ~68% of cohort attains (realistic OBE pass rate)
        logit = (
            -4.2
            + 0.055 * early_co_pct
            + 0.030 * overall_early_pct
            + 0.035 * trend
            + 0.120 * num_eval_questions
            + np.random.normal(0, 0.65)  # stochastic real-world exam day noise
        )
        prob = 1.0 / (1.0 + np.exp(-logit))
        attained_final = 1 if prob >= 0.50 else 0

        records.append({
            "course_code": course,
            "academic_year": batch,
            "student_id": student_id,
            "co_code": co,
            "early_co_pct": round(float(early_co_pct), 1),
            "num_eval_questions": int(num_eval_questions),
            "overall_early_pct": round(float(overall_early_pct), 1),
            "trend": round(float(trend), 1),
            "target_threshold": target_threshold,
            "attained_final": int(attained_final),
            "data_source": "synthetic",
        })

    df = pd.DataFrame(records)
    df.to_csv(DATA_FILE, index=False)
    print(f"[OK] Generated {len(df)} synthetic records saved to {DATA_FILE}")
    print(f"Attainment rate: {df['attained_final'].mean() * 100:.1f}%")
    return df


if __name__ == "__main__":
    generate_synthetic_historical_data()
