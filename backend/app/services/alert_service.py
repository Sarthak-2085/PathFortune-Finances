import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.services.analytics_service import get_monthly_aggregates, format_inr
from app.services.anomaly_service import detect_anomalies
from app.services.health_service import calculate_health_score
from app.services.forecasting_service import forecast_all_metrics

def generate_alerts(db: Session, business_id: str) -> list:
    """
    Generates real-time financial alerts based on thresholds, trends, forecasts, and anomalies.
    """
    alerts = []
    
    # 1. Fetch data
    df = get_monthly_aggregates(db, business_id)
    if df.empty:
        return []
        
    health_data = calculate_health_score(db, business_id)
    anomalies = detect_anomalies(db, business_id)

    latest = df.iloc[-1]
    
    # Helper to add alert
    def add_alert(alert_type, severity, title, message, metric, current_value, threshold_value, recommended_action):
        alerts.append({
            "id": str(uuid.uuid4()),
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "metric": metric,
            "current_value": current_value,
            "threshold_value": threshold_value,
            "triggered_at": datetime.utcnow().isoformat() + "Z",
            "recommended_action": recommended_action,
            "is_acknowledged": False
        })

    # --- Threshold Alerts ---
    margin = latest['profit_margin']
    if margin < 10:
        add_alert(
            alert_type="threshold", severity="critical",
            title="Critical Profit Margin Drop",
            message=f"Profit margin has fallen to critically low levels ({margin}%).",
            metric="profit_margin", current_value=f"{margin}%", threshold_value="10%",
            recommended_action="Immediately review pricing and cut non-essential costs."
        )
    elif margin < 15:
        add_alert(
            alert_type="threshold", severity="warning",
            title="Low Profit Margin Warning",
            message=f"Profit margin is below the target threshold ({margin}%).",
            metric="profit_margin", current_value=f"{margin}%", threshold_value="15%",
            recommended_action="Review upcoming expenses and identify potential savings."
        )

    health_score = health_data.get("score", 100)
    if health_score < 60:
        add_alert(
            alert_type="threshold", severity="critical",
            title="Critical Health Score",
            message=f"Overall financial health score has dropped to {health_score}/100.",
            metric="health_score", current_value=str(health_score), threshold_value="60",
            recommended_action="Conduct a comprehensive financial review immediately."
        )
    elif health_score < 75:
        add_alert(
            alert_type="threshold", severity="warning",
            title="Declining Health Score",
            message=f"Financial health score is currently at {health_score}/100.",
            metric="health_score", current_value=str(health_score), threshold_value="75",
            recommended_action="Review the risk factors in your health dashboard."
        )

    # --- Trend Alerts ---
    if len(df) >= 3:
        # 3 consecutive months of revenue decline
        rev1, rev2, rev3 = df.iloc[-3]['revenue'], df.iloc[-2]['revenue'], df.iloc[-1]['revenue']
        if rev3 < rev2 < rev1:
            add_alert(
                alert_type="trend", severity="critical",
                title="Sustained Revenue Decline",
                message="Revenue has decreased for 3 consecutive months.",
                metric="revenue_trend", current_value="3 months declining", threshold_value="0 months",
                recommended_action="Investigate sales pipeline and market conditions urgently."
            )
        
        # Profit margin declining for 3+ months
        m1, m2, m3 = df.iloc[-3]['profit_margin'], df.iloc[-2]['profit_margin'], df.iloc[-1]['profit_margin']
        if m3 < m2 < m1:
            add_alert(
                alert_type="trend", severity="warning",
                title="Consistent Margin Compression",
                message="Profit margins have been shrinking for 3 consecutive months.",
                metric="margin_trend", current_value="3 months declining", threshold_value="0 months",
                recommended_action="Evaluate if costs are rising faster than price adjustments."
            )

    if len(df) >= 2:
        # 2 consecutive months of expense growth > 10%
        exp1, exp2 = df.iloc[-2]['expenses'], df.iloc[-1]['expenses']
        growth = (exp2 - exp1) / exp1 if exp1 > 0 else 0
        if growth > 0.10:
            add_alert(
                alert_type="trend", severity="warning",
                title="Rapid Expense Growth",
                message=f"Expenses grew by {round(growth*100, 1)}% this month.",
                metric="expense_growth", current_value=f"{round(growth*100, 1)}%", threshold_value="10%",
                recommended_action="Audit expense reports for anomalies or inefficiencies."
            )

    # --- Forecast Alerts ---
    # forecast_all_metrics() returns one entry per metric with current_value /
    # next_month_prediction already resolved - use it directly instead of
    # re-deriving shape assumptions about generate_forecasts()'s single-metric output.
    try:
        combined = forecast_all_metrics(db, business_id, horizon_months=1)
        by_metric = {m['metric']: m for m in combined.get('metrics', [])}
    except Exception:
        by_metric = {}

    if by_metric:
        pred_rev = by_metric.get('revenue', {}).get('next_month_prediction', 0)
        pred_exp = by_metric.get('expenses', {}).get('next_month_prediction', 0)
        pred_prof = by_metric.get('net_profit', {}).get('next_month_prediction', 0)

        curr_rev = latest['revenue']
        curr_exp = latest['expenses']
        
        if pred_rev < curr_rev:
            add_alert(
                alert_type="forecast", severity="warning",
                title="Forecasted Revenue Decline",
                message="Our models predict a drop in revenue for the upcoming month.",
                metric="predicted_revenue", current_value=format_inr(pred_rev), threshold_value=format_inr(curr_rev),
                recommended_action="Plan promotional activities to boost next month's sales."
            )
            
        if pred_exp > curr_exp * 1.15:
            add_alert(
                alert_type="forecast", severity="warning",
                title="Forecasted Expense Spike",
                message="Expected expenses are projected to jump by over 15% next month.",
                metric="predicted_expenses", current_value=format_inr(pred_exp), threshold_value=format_inr(curr_exp * 1.15),
                recommended_action="Pre-approve or delay non-essential large purchases."
            )
            
        if pred_prof < 0:
            add_alert(
                alert_type="forecast", severity="critical",
                title="Forecasted Negative Profit",
                message="Projections indicate a net loss for the next month.",
                metric="predicted_net_profit", current_value=format_inr(pred_prof), threshold_value="₹0",
                recommended_action="Take immediate steps to secure cash reserves and defer costs."
            )

    # --- Anomaly Alerts ---
    # anomaly_service.detect_anomalies() returns observed_value / metric_category /
    # explanation - not amount / category / reason (those keys don't exist on the
    # dict, so this previously always fell back to defaults and showed ₹0).
    for anomaly in anomalies:
        amt = anomaly.get('observed_value', 0)
        add_alert(
            alert_type="anomaly", severity="warning",
            title=f"Unusual Transaction Detected ({anomaly.get('metric_category', 'Unknown')})",
            message=anomaly.get('explanation', 'A transaction fell outside expected patterns.'),
            metric="transaction_amount", current_value=format_inr(amt), threshold_value="Expected Range",
            recommended_action="Review the flagged transaction in the anomaly dashboard."
        )

    # Sort alerts: critical first, warning, info
    severity_map = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda x: severity_map.get(x['severity'], 3))
    
    return alerts
