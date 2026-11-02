import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from .model import predictor

load_dotenv()

app = FastAPI(
    title="OBE Platform ML Early Warning Service",
    description="Probabilistic Early Warning Prediction Layer for Outcome-Based Education Attainment",
    version="1.0.0",
)

# Allowed origins for ML service
env_origins = os.getenv("BACKEND_ORIGIN") or os.getenv("BACKEND_URL") or os.getenv("CORS_ORIGINS") or ""
parsed_env_origins = [o.strip() for o in env_origins.split(",") if o.strip()]

cors_origins = list(
    set(
        [
            "http://localhost:5001",
            "http://127.0.0.1:5001",
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://obeplatform.vercel.app",
            "https://obe-platform.onrender.com",
        ]
        + parsed_env_origins
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class StudentCOFeatureInstance(BaseModel):
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    roll_no: Optional[str] = None
    co_id: Optional[str] = None
    co_code: Optional[str] = None
    early_co_pct: Optional[float] = 0.0
    num_eval_questions: Optional[int] = 0
    overall_early_pct: Optional[float] = 0.0
    trend: Optional[float] = 0.0
    target_threshold: Optional[float] = 40.0


class PredictRequest(BaseModel):
    instances: List[StudentCOFeatureInstance] = Field(default_factory=list)


@app.get("/")
@app.get("/health")
@app.get("//health")
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "ml-service",
            "model_loaded": predictor.is_loaded,
            "algorithm": predictor.metadata.get("algorithm", "None"),
        },
        "message": "ML service is healthy and online",
    }


@app.get("/model-info")
async def get_model_info():
    """Returns trained model performance metrics, trained date, and data source."""
    try:
        info = predictor.get_model_info()
        return {
            "success": True,
            "data": info,
            "message": "Model metadata and metrics retrieved successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed retrieving model info: {str(e)}")


@app.post("/train")
async def train_model():
    """Triggers retraining of ML models, model selection, and metric evaluation."""
    try:
        info = predictor.train_model()
        return {
            "success": True,
            "data": info,
            "message": f"Model successfully retrained using {info.get('algorithm')}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")


@app.post("/predict")
async def predict_attainment(req: PredictRequest):
    """
    Predicts attainment probability, risk level (low/medium/high), and top contributing features
    for a cohort of student-CO pairs based on continuous early assessment features.
    """
    try:
        instances = [inst.model_dump() for inst in req.instances]
        predictions = predictor.predict_batch(instances)
        return {
            "success": True,
            "data": {
                "total_instances": len(predictions),
                "predictions": predictions,
                "model_info": {
                    "algorithm": predictor.metadata.get("algorithm"),
                    "data_source": predictor.metadata.get("data_source"),
                    "disclaimer": "Predictions are probabilistic estimates based on continuous early assessment performance.",
                },
            },
            "message": "Predictions generated successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
