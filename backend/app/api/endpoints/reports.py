from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.analytics_service import get_dashboard_summary, format_inr
from app.services.health_service import calculate_health_score
from app.services.anomaly_service import detect_anomalies
from app.services.forecasting_service import generate_forecasts

router = APIRouter()

@router.get("/monthly")
def get_monthly_management_report(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    summary = get_dashboard_summary(db, business_id)
    health = calculate_health_score(db, business_id)
    anomalies = detect_anomalies(db, business_id)
    forecast = generate_forecasts(db, business_id, horizon_months=1, target_metric="revenue")

    exec_summary = (
        f"For period {summary.period}, {summary.business_name} generated Total Revenue of {summary.total_revenue.formatted_value} "
        f"({summary.total_revenue.change_pct}% MoM) against Total Expenses of {summary.total_expenses.formatted_value} "
        f"({summary.total_expenses.change_pct}% MoM), achieving a Net Profit of {summary.net_profit.formatted_value} "
        f"with a Net Profit Margin of {summary.profit_margin.formatted_value}. Overall Financial Health Score stands at {health['score']}/100 ({health['rating']})."
    )

    return {
        "report_title": f"Monthly Financial Executive Management Report - {summary.period}",
        "business_name": summary.business_name,
        "period": summary.period,
        "executive_summary": exec_summary,
        "kpis": {
            "total_revenue": summary.total_revenue.formatted_value,
            "revenue_change": f"{summary.total_revenue.change_pct}%",
            "total_expenses": summary.total_expenses.formatted_value,
            "expense_change": f"{summary.total_expenses.change_pct}%",
            "net_profit": summary.net_profit.formatted_value,
            "profit_margin": summary.profit_margin.formatted_value,
            "cash_flow": summary.cash_flow.formatted_value,
            "health_score": f"{health['score']} / 100 ({health['rating']})"
        },
        "revenue_breakdown": summary.revenue_breakdown,
        "expense_breakdown": summary.expense_breakdown,
        "budget_vs_actual": summary.budget_vs_actual,
        "detected_anomalies": anomalies,
        "next_month_forecast": forecast['forecast_data'][0] if forecast['forecast_data'] else {},
        "recommended_actions": health['risk_factors']
    }
