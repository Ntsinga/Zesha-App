from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from app.core.db import SessionLocal
from app.models.commissions import Commissions
from app.schemas.commission import CommissionCreate, CommissionRead, CommissionUpdate

router = APIRouter(prefix="/commissions", tags=["commissions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=CommissionRead, status_code=status.HTTP_201_CREATED)
def create_commission(payload: CommissionCreate, db: Session = Depends(get_db)):
    obj = Commissions(**payload.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Commission conflict (unique constraint)")
    return obj

@router.get("/{commission_id}", response_model=CommissionRead)
def get_commission(commission_id: int, db: Session = Depends(get_db)):
    obj = db.get(Commissions, commission_id)
    if not obj:
        raise HTTPException(404, "Commission not found")
    return obj

@router.get("/", response_model=List[CommissionRead])
def list_commissions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    account: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    q = db.query(Commissions)
    if account:
        q = q.filter(Commissions.account == account)
    if date_from:
        q = q.filter(Commissions.date >= date_from)
    if date_to:
        q = q.filter(Commissions.date < date_to)
    return q.offset(skip).limit(limit).all()

@router.patch("/{commission_id}", response_model=CommissionRead)
def update_commission(commission_id: int, payload: CommissionUpdate, db: Session = Depends(get_db)):
    obj = db.get(Commissions, commission_id)
    if not obj:
        raise HTTPException(404, "Commission not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Commission conflict (unique constraint)")
    return obj

@router.delete("/{commission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_commission(commission_id: int, db: Session = Depends(get_db)):
    obj = db.get(Commissions, commission_id)
    if not obj:
        raise HTTPException(404, "Commission not found")
    db.delete(obj)
    db.commit()
