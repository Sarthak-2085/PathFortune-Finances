from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics_service import get_dashboard_summary
from app.schemas.financial import DashboardSummaryResponse

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
def read_dashboard_summary(business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        from app.models.domain import Business
        biz = db.query(Business).first()
        if not biz:
            raise HTTPException(status_code=404, detail="No business registered. Run seed script.")
        business_id = biz.id

    try:
        return get_dashboard_summary(db, business_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
