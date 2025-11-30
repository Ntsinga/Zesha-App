from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.db import SessionLocal
from app.models.company_info import CompanyInfo
from app.schemas.company_info import CompanyInfoCreate, CompanyInfoRead, CompanyInfoUpdate

router = APIRouter(prefix="/company-info", tags=["company-info"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=CompanyInfoRead, status_code=status.HTTP_201_CREATED)
def create_company_info(payload: CompanyInfoCreate, db: Session = Depends(get_db)):
    obj = CompanyInfo(**payload.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Company with this name already exists")
    return obj


@router.get("/{company_id}", response_model=CompanyInfoRead)
def get_company_info(company_id: int, db: Session = Depends(get_db)):
    obj = db.get(CompanyInfo, company_id)
    if not obj:
        raise HTTPException(404, "Company not found")
    return obj


@router.get("/", response_model=List[CompanyInfoRead])
def list_company_info(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    name: Optional[str] = None
):
    q = db.query(CompanyInfo)
    if name:
        q = q.filter(CompanyInfo.name.ilike(f"%{name}%"))
    return q.offset(skip).limit(limit).all()


@router.patch("/{company_id}", response_model=CompanyInfoRead)
def update_company_info(company_id: int, payload: CompanyInfoUpdate, db: Session = Depends(get_db)):
    obj = db.get(CompanyInfo, company_id)
    if not obj:
        raise HTTPException(404, "Company not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Company name conflict")
    return obj


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company_info(company_id: int, db: Session = Depends(get_db)):
    obj = db.get(CompanyInfo, company_id)
    if not obj:
        raise HTTPException(404, "Company not found")
    db.delete(obj)
    db.commit()
