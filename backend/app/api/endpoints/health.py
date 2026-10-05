from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.health_service import calculate_health_score

router = APIRouter()

@router.get("")
def get_financial_health(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    return calculate_health_score(db, business_id)
