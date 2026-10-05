from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import date

class TransactionBase(BaseModel):
    date: date
    description: str
    type: str  # Income, Expense
    category: str
    amount: float
    payment_method: Optional[str] = "Bank Transfer"
    department: Optional[str] = "General"
    vendor_customer: Optional[str] = None
    status: Optional[str] = "Completed"

class TransactionCreate(TransactionBase):
    """Validated input for creating a transaction. Validators live here (not on
    TransactionBase/TransactionResponse) so reading back pre-existing or imported
    rows never fails response serialization if a legacy value is slightly off-spec."""

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v_norm = v.strip().capitalize()
        if v_norm not in ("Income", "Expense"):
            raise ValueError("type must be 'Income' or 'Expense'")
        return v_norm

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v is None or v == 0:
            raise ValueError("amount must be a non-zero number")
        return round(float(v), 2)

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("description is required")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("category is required")
        return v

class TransactionResponse(TransactionBase):
    id: str
    business_id: str

    class Config:
        from_attributes = True

class KPISummary(BaseModel):
    value: float
    formatted_value: str
    change_pct: float
    previous_value: float
    direction: str  # 'up', 'down', 'flat'
    trend: List[float]

class DashboardSummaryResponse(BaseModel):
    business_name: str
    period: str
    total_revenue: KPISummary
    total_expenses: KPISummary
    net_profit: KPISummary
    cash_flow: KPISummary
    profit_margin: KPISummary
    health_score: KPISummary
    monthly_trend: List[Dict[str, Any]]
    expense_breakdown: List[Dict[str, Any]]
    revenue_breakdown: List[Dict[str, Any]]
    budget_vs_actual: List[Dict[str, Any]]

class FinancialHealthResponse(BaseModel):
    score: int
    rating: str
    component_scores: Dict[str, float]
    positive_factors: List[str]
    risk_factors: List[str]

class AnomalyResponse(BaseModel):
    id: str
    transaction_id: Optional[str]
    date: str
    anomaly_type: str
    severity: str  # High, Medium, Low
    metric_category: str
    observed_value: float
    expected_value: float
    percentage_deviation: float
    explanation: str

class ForecastMetric(BaseModel):
    period: str
    predicted_value: float
    confidence_lower: float
    confidence_upper: float

class ForecastResponse(BaseModel):
    horizon_months: int
    model_name: str
    metrics: Dict[str, float]  # MAE, RMSE, MAPE
    historical_data: List[Dict[str, Any]]
    forecast_data: List[Dict[str, Any]]
    insights: str

class ScenarioRequest(BaseModel):
    revenue_change_pct: float = 0.0
    marketing_change_pct: float = 0.0
    salaries_change_pct: float = 0.0
    operations_change_pct: float = 0.0
    fixed_expense_adj: float = 0.0

class ScenarioResponse(BaseModel):
    current: Dict[str, Any]
    simulated: Dict[str, Any]
    impact: Dict[str, Any]

class AIChatRequest(BaseModel):
    question: str
    # Optional - last few turns from the client, used only for conversational
    # tone/continuity in the Gemini prompt, never as a source of facts and
    # never persisted server-side.
    conversation_history: Optional[List[Dict[str, str]]] = None
    # Optional - a previously-computed scenario_service result the frontend
    # already has, passed through unchanged so the AI can discuss it.
    scenario_result: Optional[Dict[str, Any]] = None

class AIChatResponse(BaseModel):
    answer: str
    grounded_context_used: Dict[str, Any]
    source: str  # "gemini" | "fallback" - lets the UI show when fallback mode was used

class ManagementSummaryResponse(BaseModel):
    summary: str
    grounded_context_used: Dict[str, Any]
    source: str  # "gemini" | "fallback"


# =============================================================================
# PHASE 3 — Predictive Intelligence Schemas (Arjun)
# =============================================================================

class ForecastModelDetail(BaseModel):
    """Per-model fitted vs actual values for comparison charts."""
    model_name: str
    metrics: Dict[str, float]       # MAE, RMSE, MAPE, R2
    test_predictions: List[Dict[str, Any]]  # [{month, actual, predicted}, ...]
    is_selected: bool

class ForecastCompareMetric(BaseModel):
    """Single metric forecast summary within a combined multi-metric view."""
    metric: str                     # revenue | expenses | net_profit | cash_flow
    current_value: float
    formatted_current: str
    next_month_prediction: float
    formatted_prediction: str
    change_pct: float               # predicted vs current, as percentage
    trend_direction: str            # accelerating | decelerating | stable
    selected_model: str
    mape: float
    r2: float

class ForecastCompareResponse(BaseModel):
    """Combined multi-metric forecast returned by /api/forecast/compare."""
    horizon_months: int
    metrics: List[ForecastCompareMetric]
    combined_chart_data: List[Dict[str, Any]]  # month + actual/forecast per metric

class ForecastModelsResponse(BaseModel):
    """Per-model evaluation detail returned by /api/forecast/models."""
    target_metric: str
    horizon_months: int
    selected_model: str
    models: List[ForecastModelDetail]


# =============================================================================
# PHASE 4 — Decision Intelligence Schemas (Arjun)
# =============================================================================

# ---- Scenario Simulator Enhancements ----

class ScenarioPreset(BaseModel):
    """Pre-configured scenario parameter set."""
    name: str                       # optimistic | conservative | pessimistic
    label: str                      # Human-readable label
    description: str
    icon: str                       # lucide icon name for frontend
    params: ScenarioRequest

class ScenarioCompareRequest(BaseModel):
    """Request to compare multiple scenarios side by side."""
    scenarios: List[Dict[str, Any]]  # [{name: str, params: ScenarioRequest}, ...]

class ScenarioCompareItem(BaseModel):
    """Single scenario result within a comparison."""
    name: str
    current: Dict[str, Any]
    simulated: Dict[str, Any]
    impact: Dict[str, Any]

class ScenarioCompareResponse(BaseModel):
    """Side-by-side comparison of multiple scenarios."""
    scenarios: List[ScenarioCompareItem]

class MultiMonthScenarioRequest(BaseModel):
    """Request to project a scenario forward over multiple months."""
    months: int = 6
    revenue_change_pct: float = 0.0
    marketing_change_pct: float = 0.0
    salaries_change_pct: float = 0.0
    operations_change_pct: float = 0.0
    fixed_expense_adj: float = 0.0

class MultiMonthProjection(BaseModel):
    """Single month projection point."""
    month: str
    revenue: float
    formatted_revenue: str
    expenses: float
    formatted_expenses: str
    net_profit: float
    formatted_net_profit: str
    profit_margin: float
    cumulative_profit: float

class MultiMonthScenarioResponse(BaseModel):
    """Multi-month forward projection of a scenario."""
    months: int
    projections: List[MultiMonthProjection]
    cumulative_impact: Dict[str, Any]
    summary: str

# ---- Recommendation Engine ----

class RecommendationResponse(BaseModel):
    """Structured actionable business recommendation."""
    id: str
    category: str                   # cost_optimization | revenue_growth | risk_mitigation | operational
    priority: str                   # critical | high | medium | low
    title: str
    description: str
    impact_estimate: str            # e.g. "Save ₹1.2L/month"
    confidence: float               # 0–100
    data_evidence: Dict[str, Any]   # supporting data points
    action_items: List[str]

# ---- Smart Alerts ----

class AlertResponse(BaseModel):
    """Structured smart financial alert."""
    id: str
    alert_type: str                 # threshold | trend | forecast | anomaly
    severity: str                   # critical | warning | info
    title: str
    message: str
    metric: str
    current_value: Optional[str] = None   # pre-formatted for display, e.g. "9%" / "₹50,000"
    threshold_value: Optional[str] = None
    triggered_at: str
    recommended_action: str
    is_acknowledged: bool = False
