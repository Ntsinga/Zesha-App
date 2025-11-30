from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.db import SessionLocal
from app.models.expenses import Expense
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["expenses"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    obj = Expense(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    obj = db.get(Expense, expense_id)
    if not obj:
        raise HTTPException(404, "Expense not found")
    return obj


@router.get("/", response_model=List[ExpenseRead])
def list_expenses(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    category: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
):
    q = db.query(Expense)
    if category:
        q = q.filter(Expense.category == category)
    if date_from:
        q = q.filter(Expense.expense_date >= date_from)
    if date_to:
        q = q.filter(Expense.expense_date <= date_to)
    return q.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db)):
    obj = db.get(Expense, expense_id)
    if not obj:
        raise HTTPException(404, "Expense not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    obj = db.get(Expense, expense_id)
    if not obj:
        raise HTTPException(404, "Expense not found")
    db.delete(obj)
    db.commit()
