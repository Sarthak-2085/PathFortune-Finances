from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.domain import Transaction, Business
from app.services.analytics_service import format_inr, get_monthly_aggregates

router = APIRouter()

@router.get("/analytics")
def get_expense_analytics(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    df_monthly = get_monthly_aggregates(db, business_id)
    if df_monthly.empty:
        return {}

    total_expenses = float(df_monthly['expenses'].sum())
    avg_monthly = float(df_monthly['expenses'].mean())

    # Latest vs previous period (month-over-month growth)
    latest_expenses = float(df_monthly.iloc[-1]['expenses'])
    previous_expenses = float(df_monthly.iloc[-2]['expenses']) if len(df_monthly) > 1 else latest_expenses
    expense_growth_pct = round(
        ((latest_expenses - previous_expenses) / abs(previous_expenses)) * 100, 1
    ) if previous_expenses != 0 else 0.0

    transaction_count = db.query(func.count(Transaction.id)).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense"
    ).scalar() or 0

    # Expenses by Category
    exp_cats = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense"
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()

    category_breakdown = [
        {"category": cat, "amount": float(amt), "formatted_amount": format_inr(float(amt))}
        for cat, amt in exp_cats
    ]

    # Expenses by Department
    exp_depts = db.query(
        Transaction.department,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense"
    ).group_by(Transaction.department).all()

    department_breakdown = [
        {"department": dept or "General", "amount": float(amt), "formatted_amount": format_inr(float(amt))}
        for dept, amt in exp_depts
    ]

    # Top Vendors
    top_vends = db.query(
        Transaction.vendor_customer,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Expense"
    ).group_by(Transaction.vendor_customer).order_by(func.sum(Transaction.amount).desc()).limit(5).all()

    top_vendors = [
        {"vendor": vend or "Vendor", "amount": float(amt), "formatted_amount": format_inr(float(amt))}
        for vend, amt in top_vends
    ]

    trend = [
        {"month": row['month'], "expenses": round(row['expenses'], 2)}
        for _, row in df_monthly.iterrows()
    ]

    return {
        "total_expenses": total_expenses,
        "formatted_total_expenses": format_inr(total_expenses),
        "average_monthly_expenses": round(avg_monthly, 2),
        "formatted_average_monthly": format_inr(avg_monthly),
        "largest_expense_category": category_breakdown[0]['category'] if category_breakdown else "N/A",
        "current_period_expenses": latest_expenses,
        "previous_period_expenses": previous_expenses,
        "expense_growth_pct": expense_growth_pct,
        "transaction_count": int(transaction_count),
        "category_breakdown": category_breakdown,
        "department_breakdown": department_breakdown,
        "top_vendors": top_vendors,
        "monthly_trend": trend
    }
