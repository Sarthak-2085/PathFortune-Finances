"""
Phase 5.1 test suite - AI service hardening (Sarthak's scope).
Covers: context builder shape, no-key fallback, Gemini-failure fallback,
successful Gemini call. Does not call the real Gemini API - network calls
are mocked so tests are deterministic and don't require a GEMINI_API_KEY.
"""
import sys
import os
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal
from app.models.domain import Business, Transaction
from app.services.ai_service import build_financial_context


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
# 1. build_financial_context() shape
# =============================================================================

def test_build_financial_context_shape(business_id):
    db = SessionLocal()
    try:
        context = build_financial_context(db, business_id)
    finally:
        db.close()

    assert "business_name" in context
    assert "period" in context

    kpis = context["kpis"]
    for key in [
        "total_revenue", "revenue_change_pct", "total_expenses",
        "expense_change_pct", "net_profit", "profit_margin",
        "cash_flow", "financial_health_score"
    ]:
        assert key in kpis

    assert isinstance(context["anomalies_detected"], list)
    assert isinstance(context["budget_overruns"], list)

    forecast = context["next_month_revenue_forecast"]
    assert "predicted_revenue" in forecast
    assert "model_used" in forecast
    assert "insight" in forecast


# =============================================================================
# 2. No GEMINI_API_KEY -> deterministic fallback -> HTTP 200
# =============================================================================

def test_ai_chat_no_api_key_falls_back(client, business_id, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    resp = client.post(
        f"/api/ai/chat?business_id={business_id}",
        json={"question": "Why did my profit decrease?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["answer"], str)
    assert len(data["answer"]) > 0
    assert "grounded_context_used" in data


# =============================================================================
# 3. Gemini failure/timeout -> fallback -> HTTP 200 (no crash, no invented data)
# =============================================================================

def test_ai_chat_gemini_failure_falls_back(client, business_id, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key-for-test")

    import google.generativeai as genai

    class ExplodingModel:
        def __init__(self, *args, **kwargs):
            pass

        def generate_content(self, *args, **kwargs):
            raise TimeoutError("simulated Gemini timeout")

    monkeypatch.setattr(genai, "GenerativeModel", ExplodingModel)
    monkeypatch.setattr(genai, "configure", lambda **kwargs: None)

    resp = client.post(
        f"/api/ai/chat?business_id={business_id}",
        json={"question": "What are my biggest expenses?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    # Falls back to the same deterministic engine as the no-key path -
    # response must still be grounded in real context, not an error payload.
    assert isinstance(data["answer"], str)
    assert len(data["answer"]) > 0
    assert data["grounded_context_used"]["business_name"]


# =============================================================================
# 4. Successful Gemini call -> normal AI response (mocked, no real network)
# =============================================================================

def test_ai_chat_gemini_success(client, business_id, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key-for-test")

    import google.generativeai as genai

    class FakeResponse:
        text = "MOCKED_GEMINI_ANSWER: your profit moved as explained in context."

    class FakeModel:
        def __init__(self, *args, **kwargs):
            pass

        def generate_content(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(genai, "GenerativeModel", FakeModel)
    monkeypatch.setattr(genai, "configure", lambda **kwargs: None)

    resp = client.post(
        f"/api/ai/chat?business_id={business_id}",
        json={"question": "Why did my profit decrease?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "MOCKED_GEMINI_ANSWER: your profit moved as explained in context."


# =============================================================================
# Phase 5 (full) - expanded context, grounded Q&A, graceful degradation,
# management summary, secret-safety.
# =============================================================================

def test_context_has_expanded_sections(business_id):
    """Part 1: the context must cover health, trends, category breakdown,
    budget status, forecasts, recommendations, and recent transactions -
    all sourced from existing services, not recalculated here."""
    db = SessionLocal()
    try:
        context = build_financial_context(db, business_id)
    finally:
        db.close()

    assert "health_detail" in context
    assert "component_scores" in context["health_detail"]

    assert "monthly_trend" in context
    assert isinstance(context["monthly_trend"], list)

    assert "category_breakdown" in context
    assert "top_expense_categories" in context["category_breakdown"]
    assert "top_revenue_sources" in context["category_breakdown"]

    assert "budget_status" in context
    assert isinstance(context["budget_status"], list)

    assert "forecasts" in context
    assert "available" in context["forecasts"]

    assert "recommendations" in context
    assert isinstance(context["recommendations"], list)

    assert "recent_transactions" in context
    assert isinstance(context["recent_transactions"], list)


def test_qa_uses_grounded_context_for_category_question(client, business_id, monkeypatch):
    """Part 2: a category-spend question (no key -> fallback) must reference
    an actual category name that exists in the context, not a generic or
    hardcoded answer."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    db = SessionLocal()
    try:
        context = build_financial_context(db, business_id)
    finally:
        db.close()
    top_categories = [c["category"] for c in context["category_breakdown"]["top_expense_categories"]]

    resp = client.post(
        f"/api/ai/chat?business_id={business_id}",
        json={"question": "Which categories are costing me the most?"}
    )
    assert resp.status_code == 200
    answer = resp.json()["answer"]
    if top_categories:
        assert any(cat in answer for cat in top_categories)


def test_missing_data_handled_gracefully():
    """Part 3 (#5/#7): a business with too little history for forecasting
    must degrade gracefully - no crash, forecasts marked unavailable with a
    reason, not an invented projection."""
    db = SessionLocal()
    biz = Business(name="PytestSparseDataCo")
    db.add(biz)
    db.commit()
    biz_id = biz.id

    today = datetime.date.today()
    db.add(Transaction(
        business_id=biz_id, date=today, description="Test Income",
        type="Income", category="Consulting", amount=10000
    ))
    db.commit()
    db.close()

    db2 = SessionLocal()
    try:
        context = build_financial_context(db2, biz_id)
    finally:
        db2.close()

    assert context["forecasts"]["available"] is False
    assert "reason" in context["forecasts"]
    assert context["next_month_revenue_forecast"]["predicted_revenue"] == "Not available"
    assert isinstance(context["recommendations"], list)
    assert isinstance(context["anomalies_detected"], list)


def test_management_summary_fallback(client, business_id, monkeypatch):
    """Part 4: management summary works through the same context builder and
    falls back cleanly without a Gemini key."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    resp = client.get(f"/api/ai/summary?business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["summary"], str)
    assert len(data["summary"]) > 0
    assert data["source"] == "fallback"
    assert "grounded_context_used" in data


def test_management_summary_gemini_mocked(client, business_id, monkeypatch):
    """Management summary also exercises the Gemini path correctly (mocked)."""
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key-for-test")

    import google.generativeai as genai

    class FakeResponse:
        text = "MOCKED_SUMMARY_TEXT"

    class FakeModel:
        def __init__(self, *args, **kwargs):
            pass

        def generate_content(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(genai, "GenerativeModel", FakeModel)
    monkeypatch.setattr(genai, "configure", lambda **kwargs: None)

    resp = client.get(f"/api/ai/summary?business_id={business_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"] == "MOCKED_SUMMARY_TEXT"
    assert data["source"] == "gemini"


def test_ai_response_does_not_expose_secrets(client, business_id, monkeypatch):
    """Part 7: the API key value must never appear anywhere in the response,
    including when Gemini itself fails and the system falls back."""
    secret_value = "SUPER_SECRET_TEST_KEY_DO_NOT_LEAK_12345"
    monkeypatch.setenv("GEMINI_API_KEY", secret_value)

    import google.generativeai as genai

    class ExplodingModel:
        def __init__(self, *args, **kwargs):
            pass

        def generate_content(self, *args, **kwargs):
            raise Exception(f"auth failed for key {secret_value}")

    monkeypatch.setattr(genai, "GenerativeModel", ExplodingModel)
    monkeypatch.setattr(genai, "configure", lambda **kwargs: None)

    resp = client.post(
        f"/api/ai/chat?business_id={business_id}",
        json={"question": "Summarize my financial performance."}
    )
    assert resp.status_code == 200
    body_text = resp.text
    assert secret_value not in body_text


def test_source_field_present_on_chat_response(client, business_id, monkeypatch):
    """AIChatResponse must always report which path produced the answer."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    resp = client.post(
        f"/api/ai/chat?business_id={business_id}",
        json={"question": "Explain my financial health score."}
    )
    assert resp.status_code == 200
    assert resp.json()["source"] == "fallback"
