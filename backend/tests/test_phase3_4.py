"""
Phase 3 + 4 test suite (Arjun's scope).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal
from app.models.domain import Business

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def business_id(client):
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 200
    db = SessionLocal()
    biz = db.query(Business).first()
    db.close()
    assert biz is not None
    return biz.id

# =============================================================================
# Phase 3: Predictive Intelligence
# =============================================================================

def test_forecast_all_metrics(client, business_id):
    """Test the /api/forecast/compare endpoint returns 4 metrics and chart data."""
    resp = client.get(f"/api/forecast/compare?business_id={business_id}&horizon=3")
    assert resp.status_code == 200
    data = resp.json()
    assert "horizon_months" in data
    assert "metrics" in data
    assert "combined_chart_data" in data
    assert len(data["metrics"]) == 4

def test_forecast_models_detail(client, business_id):
    """Test the /api/forecast/models endpoint returns evaluation for multiple algorithms."""
    resp = client.get(f"/api/forecast/models?metric=revenue&horizon=3&business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_metric"] == "revenue"
    assert "models" in data
    assert len(data["models"]) >= 4

# =============================================================================
# Phase 4: Decision Intelligence - Scenarios
# =============================================================================

def test_scenario_presets(client):
    """Test the /api/scenario/presets endpoint returns the configured presets."""
    resp = client.get("/api/scenario/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 3

def test_scenario_multi_month(client, business_id):
    """Test projecting a scenario forward for multiple months."""
    payload = {
        "months": 4,
        "revenue_change_pct": 10.0,
        "marketing_change_pct": -5.0,
        "salaries_change_pct": 2.0,
        "operations_change_pct": -2.0,
        "fixed_expense_adj": 0.0
    }
    resp = client.post(f"/api/scenario/multi-month?business_id={business_id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["months"] == 4
    assert len(data["projections"]) == 4

def test_scenario_compare(client, business_id):
    """Test comparing multiple scenarios side by side."""
    payload = {
        "scenarios": [
            {
                "name": "Base",
                "params": {"revenue_change_pct": 0, "marketing_change_pct": 0, "salaries_change_pct": 0, "operations_change_pct": 0, "fixed_expense_adj": 0}
            },
            {
                "name": "Aggressive",
                "params": {"revenue_change_pct": 20, "marketing_change_pct": 15, "salaries_change_pct": 10, "operations_change_pct": 5, "fixed_expense_adj": 10000}
            }
        ]
    }
    resp = client.post(f"/api/scenario/compare?business_id={business_id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["scenarios"]) == 2

# =============================================================================
# Phase 4: Decision Intelligence - Recommendations & Alerts
# =============================================================================

def test_recommendations_generation(client, business_id):
    """Test the recommendation engine generates actionable insights."""
    resp = client.get(f"/api/recommendations?business_id={business_id}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_smart_alerts_generation(client, business_id):
    """Test the smart alerts engine evaluates thresholds and trends."""
    resp = client.get(f"/api/alerts?business_id={business_id}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
