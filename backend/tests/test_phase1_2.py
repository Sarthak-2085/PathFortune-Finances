"""
Phase 1 + 2 test suite (Krish's scope only).

Covers: database/demo seeding, transactions (incl. validation), revenue and
expense analytics, CSV/Excel import, budgets, financial health score,
Isolation Forest anomaly detection, and structured insights.

Run with:
    cd backend && source venv/bin/activate && pytest tests/test_phase1_2.py -v

Uses the app's real SQLite file (backend/data/pathfortune.db) via the normal
FastAPI startup event, matching how the app actually runs. If a business
already exists in that file, TestClient reuses it instead of re-seeding
(same auto-seed-if-empty behavior as production) - delete the db file first
for a fully fresh run.
"""
import io
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from datetime import date

from main import app
from app.core.database import SessionLocal
from app.models.domain import Business, Transaction, Budget
from app.services.anomaly_service import detect_anomalies
from app.services.health_service import calculate_health_score
from app.services.analytics_service import get_dashboard_summary


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


# ---------------------------------------------------------------------------
# Database / demo dataset / dashboard pipeline
# ---------------------------------------------------------------------------

def test_dashboard_summary_returns_real_data(client, business_id):
    resp = client.get(f"/api/dashboard/summary?business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_revenue"]["value"] > 0
    assert data["total_expenses"]["value"] > 0
    assert isinstance(data["total_revenue"]["formatted_value"], str)
    # formatted values must never leak into the numeric field
    assert isinstance(data["total_revenue"]["value"], (int, float))


def test_demo_dataset_has_realistic_volume(business_id):
    db = SessionLocal()
    count = db.query(Transaction).filter(Transaction.business_id == business_id).count()
    db.close()
    assert count > 100, "demo dataset should contain enough history for meaningful analytics"


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

def test_transactions_list_and_filter(client, business_id):
    resp = client.get(f"/api/transactions?business_id={business_id}&limit=5")
    assert resp.status_code == 200
    txs = resp.json()
    assert len(txs) <= 5

    resp_income = client.get(f"/api/transactions?business_id={business_id}&type=Income&limit=200")
    assert all(t["type"] == "Income" for t in resp_income.json())


def test_transaction_create_valid(client, business_id):
    resp = client.post(f"/api/transactions?business_id={business_id}", json={
        "date": "2026-08-01",
        "description": "Pytest valid transaction",
        "type": "income",  # lowercase - validator should normalize
        "category": "Consulting Services",
        "amount": 12345,
    })
    assert resp.status_code == 200
    assert resp.json()["type"] == "Income"


@pytest.mark.parametrize("payload,reason", [
    ({"date": "2026-08-01", "description": "x", "type": "Refund", "category": "Other", "amount": 100}, "invalid type"),
    ({"date": "2026-08-01", "description": "x", "type": "Expense", "category": "Other", "amount": 0}, "zero amount"),
    ({"date": "2026-08-01", "description": "   ", "type": "Expense", "category": "Other", "amount": 100}, "empty description"),
    ({"date": "2026-08-01", "description": "x", "type": "Expense", "category": "  ", "amount": 100}, "empty category"),
])
def test_transaction_create_rejects_invalid_input(client, payload, reason):
    resp = client.post("/api/transactions", json=payload)
    assert resp.status_code == 422, f"expected 422 for {reason}, got {resp.status_code}"


def test_transaction_delete(client, business_id):
    create = client.post(f"/api/transactions?business_id={business_id}", json={
        "date": "2026-08-02", "description": "To be deleted", "type": "Expense",
        "category": "Other", "amount": 500,
    })
    tx_id = create.json()["id"]
    delete = client.delete(f"/api/transactions/{tx_id}")
    assert delete.status_code == 200
    missing = client.delete(f"/api/transactions/{tx_id}")
    assert missing.status_code == 404


# ---------------------------------------------------------------------------
# Revenue / Expense analytics
# ---------------------------------------------------------------------------

def test_revenue_analytics_has_required_metrics(client, business_id):
    resp = client.get(f"/api/revenue/analytics?business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    for field in ["total_revenue", "average_monthly_revenue", "revenue_growth_pct",
                  "previous_period_revenue", "transaction_count", "category_breakdown",
                  "department_breakdown"]:
        assert field in data, f"missing required revenue metric: {field}"
    assert isinstance(data["total_revenue"], (int, float))  # never a formatted string


def test_expense_analytics_has_required_metrics(client, business_id):
    resp = client.get(f"/api/expenses/analytics?business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    for field in ["total_expenses", "average_monthly_expenses",
                  "expense_growth_pct", "previous_period_expenses", "transaction_count",
                  "category_breakdown"]:
        assert field in data, f"missing required expense metric: {field}"


# ---------------------------------------------------------------------------
# CSV / Excel import
# ---------------------------------------------------------------------------

VALID_CSV = (
    "date,description,type,category,amount,vendor_customer\n"
    "2026-08-05,Pytest Import Row,Expense,Software,15000,TestVendor\n"
)

INVALID_CSV = (
    "date,description,type,category,amount,vendor_customer\n"
    "not-a-date,Bad date,Expense,Software,15000,TestVendor\n"
    "2026-08-07,Bad amount,Expense,Software,notanumber,TestVendor\n"
    "2026-08-08,Zero amount,Expense,Software,0,TestVendor\n"
)

MAPPING = '{"date":"date","description":"description","type":"type","category":"category","amount":"amount","vendor_customer":"vendor_customer"}'


def test_import_preview_valid_csv(client):
    resp = client.post("/api/import/preview", files={"file": ("valid.csv", io.BytesIO(VALID_CSV.encode()), "text/csv")})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 1
    assert "amount" in data["columns"]


def test_import_process_valid_csv(client):
    resp = client.post(
        "/api/import/process",
        files={"file": ("valid.csv", io.BytesIO(VALID_CSV.encode()), "text/csv")},
        data={"column_mapping": MAPPING},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 1
    assert data["imported_count"] == 1
    assert data["error_count"] == 0


def test_import_process_rejects_invalid_rows(client):
    resp = client.post(
        "/api/import/process",
        files={"file": ("invalid.csv", io.BytesIO(INVALID_CSV.encode()), "text/csv")},
        data={"column_mapping": MAPPING},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 3
    assert data["imported_count"] == 0
    assert data["error_count"] == 3
    assert len(data["errors"]) == 3


def test_import_process_dedups_on_replay(client):
    dedup_csv = (
        "date,description,type,category,amount,vendor_customer\n"
        "2026-08-09,Pytest Dedup Row Unique,Expense,Software,17777,TestVendorDedup\n"
    )
    files = {"file": ("valid2.csv", io.BytesIO(dedup_csv.encode()), "text/csv")}
    first = client.post("/api/import/process", files=files, data={"column_mapping": MAPPING})
    assert first.json()["imported_count"] == 1

    files = {"file": ("valid2.csv", io.BytesIO(dedup_csv.encode()), "text/csv")}
    second = client.post("/api/import/process", files=files, data={"column_mapping": MAPPING})
    assert second.json()["duplicates_skipped"] >= 1


def test_import_unsupported_filetype_rejected(client):
    resp = client.post("/api/import/preview", files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")})
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------

def test_budgets_have_variance_and_utilization(client, business_id):
    resp = client.get(f"/api/budgets?business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_utilization_pct" in data
    for b in data["budgets"]:
        assert "variance" in b
        assert b["variance"] == round(b["spent_amount"] - b["allocated_amount"], 2)


def test_budget_zero_allocation_does_not_divide_by_zero(client):
    db = SessionLocal()
    biz = Business(name="PytestZeroBudgetCo")
    db.add(biz)
    db.commit()
    db.add(Budget(business_id=biz.id, month="2026-01", category="Marketing", allocated_amount=0.0))
    db.add(Transaction(business_id=biz.id, date=date(2026, 1, 5), description="spend", type="Expense", category="Marketing", amount=5000))
    db.commit()
    biz_id = biz.id
    db.close()

    resp = client.get(f"/api/budgets?month=2026-01&business_id={biz_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_utilization_pct"] == 0.0  # not NaN, not an error
    assert data["budgets"][0]["status"] == "Over Budget"


# ---------------------------------------------------------------------------
# Financial Health Score
# ---------------------------------------------------------------------------

def test_health_score_is_deterministic(client, business_id):
    r1 = client.get(f"/api/financial-health?business_id={business_id}").json()
    r2 = client.get(f"/api/financial-health?business_id={business_id}").json()
    assert r1["score"] == r2["score"]
    assert 0 <= r1["score"] <= 100


def test_health_score_matches_dashboard_embedded_value(client, business_id):
    standalone = client.get(f"/api/financial-health?business_id={business_id}").json()
    dashboard = client.get(f"/api/dashboard/summary?business_id={business_id}").json()
    assert standalone["score"] == dashboard["health_score"]["value"]


def test_health_score_insufficient_data_does_not_crash():
    db = SessionLocal()
    biz = Business(name="PytestEmptyHealthCo")
    db.add(biz)
    db.commit()
    biz_id = biz.id
    db.close()

    db2 = SessionLocal()
    result = calculate_health_score(db2, biz_id)
    db2.close()
    assert 0 <= result["score"] <= 100
    assert "risk_factors" in result


# ---------------------------------------------------------------------------
# Isolation Forest anomaly detection
# ---------------------------------------------------------------------------

def test_anomalies_endpoint_returns_list(client, business_id):
    resp = client.get(f"/api/anomalies?business_id={business_id}")
    assert resp.status_code == 200
    anomalies = resp.json()
    assert isinstance(anomalies, list)
    for a in anomalies:
        assert a["severity"] in ("High", "Medium")
        assert a["observed_value"] != a["expected_value"]


def test_anomalies_catch_seeded_outlier(client, business_id):
    """The demo generator intentionally seeds a Marketing spend spike -
    confirm the real Isolation Forest model actually catches it."""
    resp = client.get(f"/api/anomalies?business_id={business_id}")
    anomalies = resp.json()
    assert any("Marketing" in a["metric_category"] for a in anomalies), \
        "expected the intentionally-seeded Marketing anomaly to be detected"


def test_anomaly_detection_empty_dataset_returns_empty_list():
    db = SessionLocal()
    biz = Business(name="PytestEmptyAnomalyCo")
    db.add(biz)
    db.commit()
    biz_id = biz.id
    db.close()

    db2 = SessionLocal()
    result = detect_anomalies(db2, biz_id)
    db2.close()
    assert result == []


def test_anomaly_detection_identical_values_does_not_crash():
    db = SessionLocal()
    biz = Business(name="PytestIdenticalValuesCo")
    db.add(biz)
    db.commit()
    for i in range(14):
        db.add(Transaction(business_id=biz.id, date=date(2026, 1, i + 1),
                            description=f"same {i}", type="Expense", category="Same", amount=500.0))
    db.commit()
    biz_id = biz.id
    db.close()

    db2 = SessionLocal()
    result = detect_anomalies(db2, biz_id)  # must not raise
    db2.close()
    assert isinstance(result, list)


def test_anomaly_detection_single_transaction_does_not_crash():
    db = SessionLocal()
    biz = Business(name="PytestSingleTxnCo")
    db.add(biz)
    db.commit()
    db.add(Transaction(business_id=biz.id, date=date(2026, 1, 1), description="solo",
                        type="Income", category="Test", amount=1000))
    db.commit()
    biz_id = biz.id
    db.close()

    db2 = SessionLocal()
    result = detect_anomalies(db2, biz_id)  # must not raise
    db2.close()
    assert result == []


# ---------------------------------------------------------------------------
# Insights engine
# ---------------------------------------------------------------------------

def test_insights_are_structured_and_evidenced(client, business_id):
    resp = client.get(f"/api/insights?business_id={business_id}")
    assert resp.status_code == 200
    insights = resp.json()
    assert isinstance(insights, list)
    for i in insights:
        assert "title" in i and "message" in i
        assert "severity" in i


# ---------------------------------------------------------------------------
# Zero / no data edge case for the whole dashboard pipeline
# ---------------------------------------------------------------------------

def test_dashboard_summary_raises_clean_error_on_zero_transactions():
    db = SessionLocal()
    biz = Business(name="PytestZeroTxnCo")
    db.add(biz)
    db.commit()
    biz_id = biz.id
    db.close()

    db2 = SessionLocal()
    with pytest.raises(ValueError):
        get_dashboard_summary(db2, biz_id)
    db2.close()
