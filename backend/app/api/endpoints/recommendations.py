from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.recommendation_service import generate_recommendations

router = APIRouter()

@router.get("")
def get_recommendations(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None
    try:
        return generate_recommendations(db, business_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
