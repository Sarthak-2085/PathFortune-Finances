from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np

def calculate_health_score(db: Session, business_id: str):
    """
    Transparent, deterministic 0-100 Financial Health Scoring engine.
    Weights:
    1. Profit Margin (25%): Max at >= 25%, scaled down linearly to 0 at < -10%
    2. Revenue Growth MoM (20%): MoM growth >= 8% gets 20 pts, linear down to 0 at <= -10%
    3. Cash Flow Stability (20%): % of last 6 months with positive cash flow * 20
    4. Expense-to-Revenue Ratio (15%): <= 75% gets 15 pts, 0 at >= 100%
    5. Budget Adherence (10%): % of budget categories within budget * 10
    6. Anomaly Deduction Factor (10%): 10 pts minus 3 for Medium and 5 for High severity anomalies
    """
    from app.services.analytics_service import get_monthly_aggregates
    df = get_monthly_aggregates(db, business_id)
    
    if df.empty or len(df) < 2:
        return {
            "score": 75,
            "rating": "Good",
            "component_scores": {"margin": 20, "growth": 15, "cash_flow": 15, "expense_ratio": 12, "budget": 8, "anomalies": 5},
            "positive_factors": ["Initial business baseline establishing historical data."],
            "risk_factors": ["Insufficient historical data for long-term health scoring."]
        }

    latest = df.iloc[-1]
    prev = df.iloc[-2]
    last_6 = df.tail(6)

    # 1. Profit Margin (25 pts)
    margin = latest['profit_margin']
    margin_score = min(25.0, max(0.0, ((margin + 10) / 35.0) * 25.0))

    # 2. Revenue Growth (20 pts)
    rev_growth = ((latest['revenue'] - prev['revenue']) / prev['revenue']) * 100 if prev['revenue'] > 0 else 0
    growth_score = min(20.0, max(0.0, ((rev_growth + 10) / 18.0) * 20.0))

    # 3. Cash Flow Stability (20 pts)
    pos_cf_months = (last_6['cash_flow'] > 0).sum()
    cf_score = (pos_cf_months / len(last_6)) * 20.0

    # 4. Expense Ratio (15 pts)
    exp_ratio = (latest['expenses'] / latest['revenue']) if latest['revenue'] > 0 else 1.0
    exp_ratio_score = min(15.0, max(0.0, (1.0 - max(0.0, exp_ratio - 0.6) / 0.4) * 15.0))

    # 5. Budget Adherence (10 pts)
    # Check latest month budgets
    from app.models.domain import Budget, Transaction
    latest_month_str = latest['month']
    budgets = db.query(Budget).filter(Budget.business_id == business_id, Budget.month == latest_month_str).all()
    if budgets:
        within_cnt = 0
        for b in budgets:
            spent = db.query(func.sum(Transaction.amount)).filter(
                Transaction.business_id == business_id,
                Transaction.type == 'Expense',
                Transaction.category == b.category,
                func.strftime("%Y-%m", Transaction.date) == latest_month_str
            ).scalar() or 0.0
            if spent <= b.allocated_amount:
                within_cnt += 1
        budget_score = (within_cnt / len(budgets)) * 10.0
    else:
        budget_score = 8.0

    # 6. Anomaly Factor (10 pts)
    from app.services.anomaly_service import detect_anomalies
    anomalies = detect_anomalies(db, business_id)
    anomaly_penalty = 0.0
    for a in anomalies:
        if a['severity'] == 'High':
            anomaly_penalty += 5.0
        elif a['severity'] == 'Medium':
            anomaly_penalty += 2.5
    anomaly_score = max(0.0, 10.0 - anomaly_penalty)

    # Total Score
    total_score = int(round(margin_score + growth_score + cf_score + exp_ratio_score + budget_score + anomaly_score))
    total_score = min(100, max(0, total_score))

    if total_score >= 85:
        rating = "Excellent"
    elif total_score >= 75:
        rating = "Healthy"
    elif total_score >= 60:
        rating = "Moderate / Fair"
    else:
        rating = "Needs Urgent Attention"

    positive_factors = []
    risk_factors = []

    if margin >= 20:
        positive_factors.append(f"Strong profit margin ({margin:.1f}%).")
    else:
        risk_factors.append(f"Profit margin ({margin:.1f}%) is below optimal target (20%+).")

    if rev_growth > 0:
        positive_factors.append(f"Positive month-over-month revenue growth (+{rev_growth:.1f}%).")
    else:
        risk_factors.append(f"Month-over-month revenue decline ({rev_growth:.1f}%).")

    if pos_cf_months == len(last_6):
        positive_factors.append("Consistent positive cash flow over the last 6 months.")
    elif pos_cf_months < len(last_6) / 2:
        risk_factors.append("Inconsistent cash flow stability with multiple net negative months.")

    if anomalies:
        high_anom = sum(1 for a in anomalies if a['severity'] == 'High')
        if high_anom > 0:
            risk_factors.append(f"{high_anom} High-severity financial spending anomaly detected in recent months.")

    if not positive_factors:
        positive_factors.append("Stable operating cost structure.")

    return {
        "score": total_score,
        "rating": rating,
        "component_scores": {
            "Profit Margin": round(margin_score, 1),
            "Revenue Growth": round(growth_score, 1),
            "Cash Flow Stability": round(cf_score, 1),
            "Expense Ratio": round(exp_ratio_score, 1),
            "Budget Adherence": round(budget_score, 1),
            "Anomaly Stability": round(anomaly_score, 1)
        },
        "positive_factors": positive_factors,
        "risk_factors": risk_factors
    }
