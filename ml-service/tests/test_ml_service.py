import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.model import predictor
from app.synthetic_data import generate_synthetic_historical_data

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["service"] == "ml-service"
    assert "model_loaded" in data["data"]

def test_synthetic_data_generation():
    df = generate_synthetic_historical_data(n_samples=50, random_state=123)
    assert len(df) == 50
    assert "early_co_pct" in df.columns
    assert "num_eval_questions" in df.columns
    assert "overall_early_pct" in df.columns
    assert "trend" in df.columns
    assert "attained_final" in df.columns
    assert set(df["attained_final"].unique()).issubset({0, 1})

def test_model_info_endpoint():
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "algorithm" in data["data"]
    assert "metrics" in data["data"]
    assert "Synthetic" in data["data"]["data_source"]

def test_predict_endpoint_single_and_batch():
    test_instances = [
        {
            "student_id": "test_s1",
            "student_name": "High Performer",
            "roll_no": "CS101",
            "co_id": "co_1",
            "co_code": "CO1",
            "early_co_pct": 85.0,
            "num_eval_questions": 4,
            "overall_early_pct": 88.0,
            "trend": 10.0,
            "target_threshold": 40.0
        },
        {
            "student_id": "test_s2",
            "student_name": "At Risk Student",
            "roll_no": "CS102",
            "co_id": "co_1",
            "co_code": "CO1",
            "early_co_pct": 18.0,
            "num_eval_questions": 3,
            "overall_early_pct": 22.0,
            "trend": -15.0,
            "target_threshold": 40.0
        }
    ]
    response = client.post("/predict", json={"instances": test_instances})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_instances"] == 2
    preds = data["data"]["predictions"]
    assert len(preds) == 2

    # High performer should have higher attainment probability than at-risk student
    high_perf = preds[0]
    low_perf = preds[1]
    assert high_perf["attainment_probability"] > low_perf["attainment_probability"]
    assert high_perf["risk_level"] in ["low", "medium"]
    assert low_perf["risk_level"] in ["high", "medium"]
    assert "top_features" in high_perf

def test_predict_empty_batch():
    response = client.post("/predict", json={"instances": []})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_instances"] == 0
    assert data["data"]["predictions"] == []
