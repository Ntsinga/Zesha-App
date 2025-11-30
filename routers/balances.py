from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from app.core.db import SessionLocal
from app.models.balances import Balance
from app.schemas.balance import BalanceCreate, BalanceRead, BalanceUpdate

router = APIRouter(prefix="/balances", tags=["balances"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/create", response_model=BalanceRead, status_code=status.HTTP_201_CREATED)
def create_balance(payload: BalanceCreate, db: Session = Depends(get_db)):
    # Convert Pydantic model to dict and handle special types
    data = payload.model_dump()
    # Convert AnyUrl to string for database storage
    if 'image_url' in data and data['image_url'] is not None:
        data['image_url'] = str(data['image_url'])
    
    obj = Balance(**data)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Balance conflict (unique constraint)")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    return obj

@router.get("/{balance_id}", response_model=BalanceRead)
def get_balance(balance_id: int, db: Session = Depends(get_db)):
    obj = db.get(Balance, balance_id)
    if not obj:
        raise HTTPException(404, "Balance not found")
    return obj

@router.get("/", response_model=List[BalanceRead])
def list_balances(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    account: Optional[str] = None,
    shift: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    q = db.query(Balance)
    if account:
        q = q.filter(Balance.account == account)
    if shift:
        q = q.filter(Balance.shift == shift)
    if date_from:
        q = q.filter(Balance.date >= date_from)
    if date_to:
        q = q.filter(Balance.date < date_to)
    return q.offset(skip).limit(limit).all()

@router.patch("/{balance_id}", response_model=BalanceRead)
def update_balance(balance_id: int, payload: BalanceUpdate, db: Session = Depends(get_db)):
    obj = db.get(Balance, balance_id)
    if not obj:
        raise HTTPException(404, "Balance not found")
    
    # Convert Pydantic model to dict and handle special types
    update_data = payload.model_dump(exclude_unset=True)
    # Convert AnyUrl to string for database storage
    if 'image_url' in update_data and update_data['image_url'] is not None:
        update_data['image_url'] = str(update_data['image_url'])
    
    for k, v in update_data.items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Balance conflict (unique constraint)")
    return obj

@router.delete("/{balance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_balance(balance_id: int, db: Session = Depends(get_db)):
    obj = db.get(Balance, balance_id)
    if not obj:
        raise HTTPException(404, "Balance not found")
    db.delete(obj)
    db.commit()
