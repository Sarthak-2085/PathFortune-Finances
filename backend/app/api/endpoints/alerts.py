from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.alert_service import generate_alerts

router = APIRouter()

@router.get("")
def get_alerts(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None
    try:
        return generate_alerts(db, business_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
