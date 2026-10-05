from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.schemas.financial import ScenarioRequest, ScenarioResponse, MultiMonthScenarioRequest
from app.services.scenario_service import simulate_scenario, get_scenario_presets, compare_scenarios, simulate_multi_month

router = APIRouter()

@router.post("", response_model=ScenarioResponse)
def run_scenario_simulation(
    request: ScenarioRequest,
    business_id: str = None,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        return simulate_scenario(db, business_id, request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/presets")
def get_presets():
    return get_scenario_presets()

@router.post("/compare")
def compare_scenario_presets(request: dict, business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        scenarios = request.get("scenarios", [])
        return compare_scenarios(db, business_id, scenarios)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/multi-month")
def multi_month_projection(request: MultiMonthScenarioRequest, business_id: str = None, db: Session = Depends(get_db)):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        return simulate_multi_month(db, business_id, request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
