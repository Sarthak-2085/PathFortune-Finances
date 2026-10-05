from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.domain import Transaction, Business
from app.schemas.financial import TransactionResponse, TransactionCreate

router = APIRouter()

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    business_id: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        if biz:
            business_id = biz.id

    query = db.query(Transaction)
    if business_id:
        query = query.filter(Transaction.business_id == business_id)
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Transaction.category == category)
    if search:
        query = query.filter(
            (Transaction.description.ilike(f"%{search}%")) | 
            (Transaction.vendor_customer.ilike(f"%{search}%"))
        )

    return query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()

@router.post("", response_model=TransactionResponse)
def create_transaction(
    tx: TransactionCreate,
    business_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered. Run seed script.")

    db_tx = Transaction(
        business_id=business_id,
        date=tx.date,
        description=tx.description,
        type=tx.type,
        category=tx.category,
        amount=tx.amount,
        payment_method=tx.payment_method,
        department=tx.department,
        vendor_customer=tx.vendor_customer,
        status=tx.status
    )
    try:
        db.add(db_tx)
        db.commit()
        db.refresh(db_tx)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save transaction: {str(e)}")
    return db_tx

@router.delete("/{tx_id}")
def delete_transaction(tx_id: str, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"message": "Transaction deleted successfully"}
