from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import pandas as pd
from app.core.db import SessionLocal
from app.models.reported_balances import ReportBalances
from app.schemas.reported_balance import (
    ReportedBalanceCreate, ReportedBalanceRead, ReportedBalanceUpdate
)
from app.services.excel_processing import ExcelProcessingService

router = APIRouter(prefix="/reported-balances", tags=["reported-balances"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ReportedBalanceRead, status_code=status.HTTP_201_CREATED)
def create_reported_balance(payload: ReportedBalanceCreate, db: Session = Depends(get_db)):
    # Convert Pydantic model to dict and handle special types
    data = payload.model_dump()
    # Convert AnyUrl to string for database storage
    if 'file_url' in data and data['file_url'] is not None:
        data['file_url'] = str(data['file_url'])
    
    obj = ReportBalances(**data)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Reported balance conflict (unique constraint)")
    return obj

@router.get("/{rb_id}", response_model=ReportedBalanceRead)
def get_reported_balance(rb_id: int, db: Session = Depends(get_db)):
    obj = db.get(ReportBalances, rb_id)
    if not obj:
        raise HTTPException(404, "Reported balance not found")
    return obj

@router.get("/", response_model=List[ReportedBalanceRead])
def list_reported_balances(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=50, le=500),
    account: Optional[str] = None,
    shift: Optional[str] = None,
    submitted_from: Optional[datetime] = None,
    submitted_to: Optional[datetime] = None,
):
    q = db.query(ReportBalances)
    if account:
        q = q.filter(ReportBalances.account == account)
    if shift:
        q = q.filter(ReportBalances.shift == shift)
    if submitted_from:
        q = q.filter(ReportBalances.submitted_at >= submitted_from)
    if submitted_to:
        q = q.filter(ReportBalances.submitted_at < submitted_to)
    return q.offset(skip).limit(limit).all()

@router.patch("/{rb_id}", response_model=ReportedBalanceRead)
def update_reported_balance(rb_id: int, payload: ReportedBalanceUpdate, db: Session = Depends(get_db)):
    obj = db.get(ReportBalances, rb_id)
    if not obj:
        raise HTTPException(404, "Reported balance not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Reported balance conflict (unique constraint)")
    return obj

@router.delete("/{rb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reported_balance(rb_id: int, db: Session = Depends(get_db)):
    obj = db.get(ReportBalances, rb_id)
    if not obj:
        raise HTTPException(404, "Reported balance not found")
    db.delete(obj)
    db.commit()

@router.post("/upload-excel", status_code=status.HTTP_201_CREATED)
async def upload_excel_file(
    file: UploadFile = File(...),
    source: str = "excel_upload",
    db: Session = Depends(get_db)
):
    """
    Upload and process an Excel file using Zesha Capital format.
    Automatically determines shift (AM/PM) and date based on upload time.
    
    This endpoint handles the complete workflow:
    1. Validates file format
    2. Auto-determines shift based on time (AM if before 12:00, PM if after)
    3. Delegates processing to ExcelProcessingService
    4. Automatically triggers reconciliation after processing
    5. Returns comprehensive results including reconciliation status
    """
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400, 
            detail="File must be an Excel file (.xlsx or .xls)"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Initialize the processing service
        excel_service = ExcelProcessingService(db)
        
        # Process the Excel file (shift and date auto-determined)
        result = excel_service.process_zesha_excel(
            file_content=file_content,
            filename=file.filename,
            source=source
        )
        
        # Convert result to JSON-serializable format
        import json
        from decimal import Decimal
        from datetime import datetime, date
        from app.enums import ShiftEnum
        
        def make_serializable(obj):
            """Recursively convert non-serializable objects to JSON-compatible types"""
            if isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(item) for item in obj]
            elif isinstance(obj, Decimal):
                return float(obj)
            elif isinstance(obj, (datetime, date)):
                return obj.isoformat()
            elif isinstance(obj, ShiftEnum):
                return obj.value
            elif hasattr(obj, '__dict__'):
                # Handle SQLAlchemy models or other objects
                return str(obj)
            return obj
        
        serializable_result = make_serializable(result)
        return serializable_result
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except pd.errors.EmptyDataError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Excel file is empty or corrupted"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing Excel file: {str(e)}"
        )
