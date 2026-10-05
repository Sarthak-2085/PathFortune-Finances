from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.services.forecasting_service import generate_forecasts, forecast_all_metrics, get_model_comparison_detail

router = APIRouter()

@router.get("")
def get_forecasting_data(
    metric: str = Query("revenue", enum=["revenue", "expenses", "net_profit", "cash_flow"]),
    horizon: int = Query(3, ge=1, le=6),
    business_id: str = None,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        return generate_forecasts(db, business_id, horizon_months=horizon, target_metric=metric)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compare")
def get_forecast_comparison(
    horizon: int = Query(3, ge=1, le=6),
    business_id: str = None,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        return forecast_all_metrics(db, business_id, horizon_months=horizon)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
def get_model_details(
    metric: str = Query("revenue", enum=["revenue", "expenses", "net_profit", "cash_flow"]),
    horizon: int = Query(3, ge=1, le=6),
    business_id: str = None,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        return get_model_comparison_detail(db, business_id, horizon_months=horizon, target_metric=metric)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
