from sqlalchemy.orm import Session
from app.services.analytics_service import get_dashboard_summary, format_inr
from app.services.anomaly_service import detect_anomalies
from app.services.health_service import calculate_health_score

def generate_insights(db: Session, business_id: str):
    """
    Synthesizes financial metrics, anomaly alerts, budget status, and health scores
    into structured actionable business insights and viva-explainable recommendations.
    """
    summary = get_dashboard_summary(db, business_id)
    anomalies = detect_anomalies(db, business_id)
    health = calculate_health_score(db, business_id)

    insights = []

    # 1. Revenue vs Expense Growth Insight
    rev_change = summary.total_revenue.change_pct
    exp_change = summary.total_expenses.change_pct

    if exp_change > rev_change:
        insights.append({
            "id": "ins_exp_warning",
            "type": "expense_warning",
            "severity": "high" if (exp_change - rev_change) > 10 else "medium",
            "title": "Expense Growth Exceeding Revenue Growth",
            "metric": "Expenses MoM",
            "change": exp_change,
            "message": f"Operating expenses grew by {exp_change}% this month while revenue changed by {rev_change}%. Review discretionary vendor spending.",
            "recommendation": "Perform cost-benefit audit on recent marketing and operational vendor invoices."
        })
    elif rev_change > 0:
        insights.append({
            "id": "ins_rev_growth",
            "type": "revenue_growth",
            "severity": "low",
            "title": "Positive Top-line Revenue Momentum",
            "metric": "Revenue MoM",
            "change": rev_change,
            "message": f"Revenue expanded by {rev_change}% MoM to reach {summary.total_revenue.formatted_value}.",
            "recommendation": "Reinvest surplus cash flow into high-performing client acquisition channels."
        })

    # 2. Budget Overrun Insights
    overbudget_items = [b for b in summary.budget_vs_actual if b['status'] == 'Over Budget']
    if overbudget_items:
        top_over = max(overbudget_items, key=lambda x: x['variance_pct'])
        insights.append({
            "id": f"ins_budget_{top_over['category']}",
            "type": "budget_alert",
            "severity": "high" if top_over['variance_pct'] > 20 else "medium",
            "title": f"Budget Allocation Overrun in {top_over['category']}",
            "metric": top_over['category'],
            "change": top_over['variance_pct'],
            "message": f"{top_over['category']} expenditure ({top_over['formatted_spent']}) exceeded allocated monthly budget ({top_over['formatted_allocated']}) by {top_over['variance_pct']}%.",
            "recommendation": f"Enforce approval thresholds for all upcoming {top_over['category']} requisitions."
        })

    # 3. Anomaly Insights
    if anomalies:
        top_anom = anomalies[0]
        insights.append({
            "id": f"ins_anom_{top_anom['id']}",
            "type": "anomaly_alert",
            "severity": top_anom['severity'].lower(),
            "title": f"Financial Anomaly: {top_anom['anomaly_type']}",
            "metric": top_anom['metric_category'],
            "change": top_anom['percentage_deviation'],
            "message": top_anom['explanation'],
            "recommendation": "Verify vendor transaction authenticity and check for accidental duplicate billing."
        })

    # 4. Financial Health Summary Insight
    insights.append({
        "id": "ins_health_summary",
        "type": "health_summary",
        "severity": "low" if health['score'] >= 75 else "medium",
        "title": f"Overall Financial Health Score: {health['score']} / 100 ({health['rating']})",
        "metric": "Health Score",
        "change": 0.0,
        "message": f"Business financial health rating is {health['rating']}. Primary positive driver: {health['positive_factors'][0] if health['positive_factors'] else 'Stable operations'}.",
        "recommendation": f"Focus on addressing key risk factor: {health['risk_factors'][0] if health['risk_factors'] else 'Maintain current budget discipline'}."
    })

    return insights
