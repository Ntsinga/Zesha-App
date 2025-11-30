from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from app.core.db import SessionLocal
from app.models.reported_totals import ReportedTotals
from app.schemas.reported_total import (
    ReportedTotalCreate, ReportedTotalRead, ReportedTotalUpdate
)

router = APIRouter(prefix="/reported-totals", tags=["reported-totals"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ReportedTotalRead, status_code=status.HTTP_201_CREATED)
def create_reported_total(payload: ReportedTotalCreate, db: Session = Depends(get_db)):
    # Convert Pydantic model to dict and handle special types
    data = payload.model_dump()
    # Convert AnyUrl to string for database storage
    if 'file_url' in data and data['file_url'] is not None:
        data['file_url'] = str(data['file_url'])
    
    obj = ReportedTotals(**data)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Reported total conflict (unique constraint)")
    return obj

@router.get("/{rt_id}", response_model=ReportedTotalRead)
def get_reported_total(rt_id: int, db: Session = Depends(get_db)):
    obj = db.get(ReportedTotals, rt_id)
    if not obj:
        raise HTTPException(404, "Reported total not found")
    return obj

@router.get("/", response_model=List[ReportedTotalRead])
def list_reported_totals(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    account: Optional[str] = None,
    shift: Optional[str] = None,
    submitted_from: Optional[datetime] = None,
    submitted_to: Optional[datetime] = None,
):
    q = db.query(ReportedTotals)
    if account:
        q = q.filter(ReportedTotals.account == account)
    if shift:
        q = q.filter(ReportedTotals.shift == shift)
    if submitted_from:
        q = q.filter(ReportedTotals.submitted_at >= submitted_from)
    if submitted_to:
        q = q.filter(ReportedTotals.submitted_at < submitted_to)
    return q.offset(skip).limit(limit).all()

@router.patch("/{rt_id}", response_model=ReportedTotalRead)
def update_reported_total(rt_id: int, payload: ReportedTotalUpdate, db: Session = Depends(get_db)):
    obj = db.get(ReportedTotals, rt_id)
    if not obj:
        raise HTTPException(404, "Reported total not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Reported total conflict (unique constraint)")
    return obj

@router.delete("/{rt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reported_total(rt_id: int, db: Session = Depends(get_db)):
    obj = db.get(ReportedTotals, rt_id)
    if not obj:
        raise HTTPException(404, "Reported total not found")
    db.delete(obj)
    db.commit()
