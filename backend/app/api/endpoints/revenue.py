from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.domain import Transaction, Business
from app.services.analytics_service import format_inr, get_monthly_aggregates

router = APIRouter()

@router.get("/analytics")
def get_revenue_analytics(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    df_monthly = get_monthly_aggregates(db, business_id)
    if df_monthly.empty:
        return {}

    total_revenue = float(df_monthly['revenue'].sum())
    avg_monthly = float(df_monthly['revenue'].mean())

    # Latest vs previous period (month-over-month growth)
    latest_revenue = float(df_monthly.iloc[-1]['revenue'])
    previous_revenue = float(df_monthly.iloc[-2]['revenue']) if len(df_monthly) > 1 else latest_revenue
    revenue_growth_pct = round(
        ((latest_revenue - previous_revenue) / abs(previous_revenue)) * 100, 1
    ) if previous_revenue != 0 else 0.0

    transaction_count = db.query(func.count(Transaction.id)).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Income"
    ).scalar() or 0

    # Revenue by Category
    rev_cats = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Income"
    ).group_by(Transaction.category).all()

    category_breakdown = [
        {"category": cat, "amount": float(amt), "formatted_amount": format_inr(float(amt))}
        for cat, amt in rev_cats
    ]

    # Revenue by Department
    rev_depts = db.query(
        Transaction.department,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Income"
    ).group_by(Transaction.department).all()

    department_breakdown = [
        {"department": dept or "General", "amount": float(amt), "formatted_amount": format_inr(float(amt))}
        for dept, amt in rev_depts
    ]

    # Revenue by Customer/Vendor
    rev_customers = db.query(
        Transaction.vendor_customer,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.business_id == business_id,
        Transaction.type == "Income"
    ).group_by(Transaction.vendor_customer).order_by(func.sum(Transaction.amount).desc()).limit(5).all()

    top_customers = [
        {"customer": cust or "General", "amount": float(amt), "formatted_amount": format_inr(float(amt))}
        for cust, amt in rev_customers
    ]

    # Trend
    trend = [
        {"month": row['month'], "revenue": round(row['revenue'], 2)}
        for _, row in df_monthly.iterrows()
    ]

    return {
        "total_revenue": total_revenue,
        "formatted_total_revenue": format_inr(total_revenue),
        "average_monthly_revenue": round(avg_monthly, 2),
        "formatted_average_monthly": format_inr(avg_monthly),
        "largest_revenue_source": category_breakdown[0]['category'] if category_breakdown else "N/A",
        "current_period_revenue": latest_revenue,
        "previous_period_revenue": previous_revenue,
        "revenue_growth_pct": revenue_growth_pct,
        "transaction_count": int(transaction_count),
        "category_breakdown": category_breakdown,
        "department_breakdown": department_breakdown,
        "top_customers": top_customers,
        "monthly_trend": trend
    }
