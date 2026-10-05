from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.domain import Budget, Transaction, Business
from app.services.analytics_service import format_inr

router = APIRouter()

@router.get("")
def get_budgets(month: str = None, business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    # Get latest month if not specified
    if not month:
        latest_tx = db.query(Transaction).filter(Transaction.business_id == business_id).order_by(Transaction.date.desc()).first()
        month = latest_tx.date.strftime("%Y-%m") if latest_tx else "2026-07"

    budgets = db.query(Budget).filter(
        Budget.business_id == business_id,
        Budget.month == month
    ).all()

    res = []
    total_allocated = 0.0
    total_spent = 0.0

    for b in budgets:
        spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.business_id == business_id,
            Transaction.type == 'Expense',
            Transaction.category == b.category,
            func.strftime("%Y-%m", Transaction.date) == month
        ).scalar() or 0.0

        total_allocated += b.allocated_amount
        total_spent += spent

        res.append({
            "id": b.id,
            "category": b.category,
            "department": b.department,
            "allocated_amount": b.allocated_amount,
            "formatted_allocated": format_inr(b.allocated_amount),
            "spent_amount": spent,
            "formatted_spent": format_inr(spent),
            "remaining_amount": b.allocated_amount - spent,
            "formatted_remaining": format_inr(b.allocated_amount - spent),
            # variance = actual - budget (positive means overspend)
            "variance": spent - b.allocated_amount,
            "formatted_variance": format_inr(spent - b.allocated_amount),
            "utilization_pct": round((spent / b.allocated_amount) * 100, 1) if b.allocated_amount > 0 else 0.0,
            "status": "Over Budget" if spent > b.allocated_amount else "Within Budget"
        })

    overall_utilization_pct = round((total_spent / total_allocated) * 100, 1) if total_allocated > 0 else 0.0

    return {
        "month": month,
        "total_allocated": total_allocated,
        "formatted_total_allocated": format_inr(total_allocated),
        "total_spent": total_spent,
        "formatted_total_spent": format_inr(total_spent),
        "overall_utilization_pct": overall_utilization_pct,
        "budgets": res
    }
