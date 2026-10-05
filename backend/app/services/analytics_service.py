from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
import pandas as pd
import numpy as np
from app.models.domain import Transaction, Budget, Business
from app.schemas.financial import DashboardSummaryResponse, KPISummary

def format_inr(amount: float) -> str:
    """Format numerical values in Indian Rupee format (₹ L / Cr or standard comma notation)."""
    abs_amt = abs(amount)
    sign = "-" if amount < 0 else ""
    
    if abs_amt >= 10000000:
        val = abs_amt / 10000000
        return f"{sign}₹{val:.2f} Cr"
    elif abs_amt >= 100000:
        val = abs_amt / 100000
        return f"{sign}₹{val:.2f} L"
    else:
        return f"{sign}₹{abs_amt:,.2f}"

def get_monthly_aggregates(db: Session, business_id: str):
    """Returns a pandas DataFrame of monthly aggregated Revenue, Expenses, Profit, Cash Flow."""
    query = db.query(Transaction).filter(Transaction.business_id == business_id).all()
    if not query:
        return pd.DataFrame()

    data = [{
        "date": t.date,
        "month": t.date.strftime("%Y-%m"),
        "type": t.type,
        "category": t.category,
        "amount": t.amount
    } for t in query]

    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])

    # Pivot by month and transaction type
    pivoted = df.groupby(['month', 'type'])['amount'].sum().unstack(fill_value=0).reset_index()
    if 'Income' not in pivoted.columns:
        pivoted['Income'] = 0.0
    if 'Expense' not in pivoted.columns:
        pivoted['Expense'] = 0.0

    pivoted.rename(columns={'Income': 'revenue', 'Expense': 'expenses'}, inplace=True)
    pivoted['net_profit'] = pivoted['revenue'] - pivoted['expenses']
    pivoted['cash_flow'] = pivoted['net_profit']  # Cash accounting approximation
    pivoted['profit_margin'] = np.where(
        pivoted['revenue'] > 0,
        (pivoted['net_profit'] / pivoted['revenue']) * 100,
        0.0
    )
    pivoted.sort_values('month', inplace=True)
    return pivoted

def get_dashboard_summary(db: Session, business_id: str) -> DashboardSummaryResponse:
    business = db.query(Business).filter(Business.id == business_id).first()
    business_name = business.name if business else "PathFortune Business"

    df_monthly = get_monthly_aggregates(db, business_id)
    if df_monthly.empty:
        raise ValueError("No transaction data available.")

    # Latest month vs Previous month
    latest_row = df_monthly.iloc[-1]
    prev_row = df_monthly.iloc[-2] if len(df_monthly) > 1 else latest_row

    def calc_pct(curr, prev):
        if prev == 0:
            return 0.0
        return round(((curr - prev) / abs(prev)) * 100, 1)

    rev_curr, rev_prev = latest_row['revenue'], prev_row['revenue']
    exp_curr, exp_prev = latest_row['expenses'], prev_row['expenses']
    prof_curr, prof_prev = latest_row['net_profit'], prev_row['net_profit']
    cf_curr, cf_prev = latest_row['cash_flow'], prev_row['cash_flow']
    margin_curr, margin_prev = latest_row['profit_margin'], prev_row['profit_margin']

    rev_change = calc_pct(rev_curr, rev_prev)
    exp_change = calc_pct(exp_curr, exp_prev)
    prof_change = calc_pct(prof_curr, prof_prev)
    cf_change = calc_pct(cf_curr, cf_prev)
    margin_change = round(margin_curr - margin_prev, 1)

    # Health score logic (Imported or computed)
    from app.services.health_service import calculate_health_score
    health_res = calculate_health_score(db, business_id)
    health_score_val = health_res['score']

    # Sparkline trends (last 6 months)
    last_6 = df_monthly.tail(6)
    rev_trend = last_6['revenue'].tolist()
    exp_trend = last_6['expenses'].tolist()
    prof_trend = last_6['net_profit'].tolist()
    cf_trend = last_6['cash_flow'].tolist()
    margin_trend = last_6['profit_margin'].tolist()

    # Category breakdown (latest month)
    latest_month_str = latest_row['month']
    tx_latest = db.query(Transaction).filter(
        Transaction.business_id == business_id,
        func.strftime("%Y-%m", Transaction.date) == latest_month_str
    ).all()

    exp_cats = {}
    rev_cats = {}
    for t in tx_latest:
        if t.type == "Expense":
            exp_cats[t.category] = exp_cats.get(t.category, 0.0) + t.amount
        elif t.type == "Income":
            rev_cats[t.category] = rev_cats.get(t.category, 0.0) + t.amount

    exp_breakdown = [{"category": k, "amount": v, "formatted_amount": format_inr(v)} for k, v in exp_cats.items()]
    rev_breakdown = [{"category": k, "amount": v, "formatted_amount": format_inr(v)} for k, v in rev_cats.items()]

    # Budget vs Actual (latest month)
    budgets = db.query(Budget).filter(
        Budget.business_id == business_id,
        Budget.month == latest_month_str
    ).all()

    budget_vs_actual = []
    for b in budgets:
        spent = exp_cats.get(b.category, 0.0)
        budget_vs_actual.append({
            "category": b.category,
            "allocated": b.allocated_amount,
            "spent": spent,
            "formatted_allocated": format_inr(b.allocated_amount),
            "formatted_spent": format_inr(spent),
            "status": "Over Budget" if spent > b.allocated_amount else "Within Budget",
            "variance_pct": round(((spent - b.allocated_amount) / b.allocated_amount) * 100, 1) if b.allocated_amount > 0 else 0.0
        })

    # Monthly Trend (Full history formatted for Recharts)
    monthly_trend = []
    for _, row in df_monthly.iterrows():
        monthly_trend.append({
            "month": row['month'],
            "revenue": round(row['revenue'], 2),
            "expenses": round(row['expenses'], 2),
            "net_profit": round(row['net_profit'], 2),
            "cash_flow": round(row['cash_flow'], 2),
            "profit_margin": round(row['profit_margin'], 1)
        })

    return DashboardSummaryResponse(
        business_name=business_name,
        period=f"Month of {latest_month_str}",
        total_revenue=KPISummary(
            value=rev_curr,
            formatted_value=format_inr(rev_curr),
            change_pct=rev_change,
            previous_value=rev_prev,
            direction="up" if rev_change >= 0 else "down",
            trend=rev_trend
        ),
        total_expenses=KPISummary(
            value=exp_curr,
            formatted_value=format_inr(exp_curr),
            change_pct=exp_change,
            previous_value=exp_prev,
            direction="down" if exp_change <= 0 else "up",  # lower expenses is good
            trend=exp_trend
        ),
        net_profit=KPISummary(
            value=prof_curr,
            formatted_value=format_inr(prof_curr),
            change_pct=prof_change,
            previous_value=prof_prev,
            direction="up" if prof_change >= 0 else "down",
            trend=prof_trend
        ),
        cash_flow=KPISummary(
            value=cf_curr,
            formatted_value=format_inr(cf_curr),
            change_pct=cf_change,
            previous_value=cf_prev,
            direction="up" if cf_change >= 0 else "down",
            trend=cf_trend
        ),
        profit_margin=KPISummary(
            value=margin_curr,
            formatted_value=f"{margin_curr:.1f}%",
            change_pct=margin_change,
            previous_value=margin_prev,
            direction="up" if margin_change >= 0 else "down",
            trend=margin_trend
        ),
        health_score=KPISummary(
            value=health_score_val,
            formatted_value=f"{health_score_val} / 100",
            change_pct=0.0,
            previous_value=health_score_val,
            direction="up" if health_score_val >= 75 else "down",
            trend=[health_score_val] * len(rev_trend)
        ),
        monthly_trend=monthly_trend,
        expense_breakdown=exp_breakdown,
        revenue_breakdown=rev_breakdown,
        budget_vs_actual=budget_vs_actual
    )
