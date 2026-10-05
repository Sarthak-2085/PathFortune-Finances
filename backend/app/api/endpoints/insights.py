from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.insight_service import generate_insights

router = APIRouter()

@router.get("")
def get_insights(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    return generate_insights(db, business_id)
