from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Business
from app.schemas.financial import AIChatRequest, AIChatResponse, ManagementSummaryResponse
from app.services.ai_service import query_ai_assistant, generate_management_summary

router = APIRouter()


def _resolve_business_id(db: Session, business_id: str = None) -> str:
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None
    return business_id


@router.post("/chat", response_model=AIChatResponse)
def ask_pathfortune_ai(
    request: AIChatRequest,
    business_id: str = None,
    db: Session = Depends(get_db)
):
    business_id = _resolve_business_id(db, business_id)
    try:
        return query_ai_assistant(
            db,
            business_id,
            request.question,
            conversation_history=request.conversation_history,
            scenario_result=request.scenario_result
        )
    except Exception as e:
        # Generic message only - never echo raw internals (paths, config, keys)
        # back to the client.
        raise HTTPException(status_code=500, detail="Could not generate an AI response for this business right now.")


@router.get("/summary", response_model=ManagementSummaryResponse)
def ask_management_summary(
    business_id: str = None,
    db: Session = Depends(get_db)
):
    business_id = _resolve_business_id(db, business_id)
    try:
        return generate_management_summary(db, business_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not generate a management summary for this business right now.")
