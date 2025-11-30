from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date
from app.core.db import SessionLocal
from app.models.reconciliations import Reconciliations
from app.schemas.reconciliation import (
    ReconciliationCreate, ReconciliationRead, ReconciliationUpdate
)
from app.services.reconciliation_service import ReconciliationService
from app.enums import ShiftEnum

router = APIRouter(prefix="/reconciliations", tags=["reconciliations"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ReconciliationRead, status_code=status.HTTP_201_CREATED)
def create_reconciliation(payload: ReconciliationCreate, db: Session = Depends(get_db)):
    obj = Reconciliations(**payload.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Reconciliation conflict (unique constraint, e.g. run_key)")
    return obj

@router.get("/{recon_id}", response_model=ReconciliationRead)
def get_reconciliation(recon_id: int, db: Session = Depends(get_db)):
    obj = db.get(Reconciliations, recon_id)
    if not obj:
        raise HTTPException(404, "Reconciliation not found")
    return obj

@router.get("/", response_model=List[ReconciliationRead])
def list_reconciliations(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    on_date: Optional[date] = None,
    shift: Optional[str] = None,
    run_key: Optional[str] = None,
):
    q = db.query(Reconciliations)
    if on_date:
        q = q.filter(Reconciliations.date == on_date)
    if shift:
        q = q.filter(Reconciliations.shift == shift)
    if run_key:
        q = q.filter(Reconciliations.run_key == run_key)
    return q.offset(skip).limit(limit).all()

@router.patch("/{recon_id}", response_model=ReconciliationRead)
def update_reconciliation(recon_id: int, payload: ReconciliationUpdate, db: Session = Depends(get_db)):
    obj = db.get(Reconciliations, recon_id)
    if not obj:
        raise HTTPException(404, "Reconciliation not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Reconciliation conflict (unique constraint)")
    return obj

@router.delete("/{recon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reconciliation(recon_id: int, db: Session = Depends(get_db)):
    obj = db.get(Reconciliations, recon_id)
    if not obj:
        raise HTTPException(404, "Reconciliation not found")
    db.delete(obj)
    db.commit()


@router.post("/perform", status_code=status.HTTP_201_CREATED)
def perform_reconciliation(
    reconciliation_date: date = Query(..., description="Date to reconcile (YYYY-MM-DD)"),
    shift: ShiftEnum = Query(..., description="Shift to reconcile (AM/PM)"),
    reviewer: Optional[str] = Query(None, description="Name/email of reviewer"),
    db: Session = Depends(get_db)
):
    """
    Perform reconciliation for a specific date and shift.
    
    This endpoint:
    1. Calculates total float from reported balances (Excel uploads)
    2. Validates that reported balances match actual balance submissions
    3. Compares calculated totals with reported totals
    4. Creates reconciliation record with PASSED/FAILED status
    
    The reconciliation PASSES only if:
    - Total variances are within ±1.00 tolerance
    - All individual account balances match between reported and actual
    """
    reconciliation_service = ReconciliationService(db)
    
    try:
        result = reconciliation_service.perform_reconciliation(
            reconciliation_date=reconciliation_date,
            shift=shift,
            reviewer=reviewer
        )
        
        if result["status"] == "error":
            raise HTTPException(
                status_code=409,
                detail=result["message"]
            )
        
        return result
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error performing reconciliation: {str(e)}"
        )


@router.get("/summary")
def get_reconciliation_summary(
    reconciliation_date: date = Query(..., description="Date to check (YYYY-MM-DD)"),
    shift: ShiftEnum = Query(..., description="Shift to check (AM/PM)"),
    db: Session = Depends(get_db)
):
    """
    Get a summary of available data for reconciliation without performing it.
    
    This endpoint provides:
    - Count of reported balance records (from Excel)
    - Count of actual balance submissions
    - Calculated totals from both sources
    - Balance validation results (account-by-account comparison)
    - Data quality flags and readiness assessment
    """
    reconciliation_service = ReconciliationService(db)
    
    try:
        summary = reconciliation_service.get_reconciliation_summary(
            reconciliation_date=reconciliation_date,
            shift=shift
        )
        return summary
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting reconciliation summary: {str(e)}"
        )


@router.get("/validate-balances")
def validate_reported_vs_actual_balances(
    reconciliation_date: date = Query(..., description="Date to validate (YYYY-MM-DD)"),
    shift: ShiftEnum = Query(..., description="Shift to validate (AM/PM)"),
    db: Session = Depends(get_db)
):
    """
    Validate that reported balances (from Excel) match actual balance submissions.
    
    Returns detailed account-by-account comparison showing:
    - Matching accounts
    - Mismatched amounts (beyond ±1.00 tolerance)
    - Accounts missing from actual submissions
    - Accounts missing from reports
    """
    reconciliation_service = ReconciliationService(db)
    
    try:
        validation = reconciliation_service._validate_reported_vs_actual_balances(
            reconciliation_date=reconciliation_date,
            shift=shift
        )
        return {
            "date": reconciliation_date.isoformat(),
            "shift": shift.value,
            "validation_result": validation
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error validating balances: {str(e)}"
        )
