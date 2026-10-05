from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.anomaly_service import detect_anomalies

router = APIRouter()

@router.get("")
def get_detected_anomalies(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    if not business_id:
        raise HTTPException(status_code=404, detail="No business registered. Run seed script.")

    try:
        return detect_anomalies(db, business_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")
