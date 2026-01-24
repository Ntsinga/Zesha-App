from sqlalchemy import Column, String, Date, DateTime, Numeric, Enum, Integer, Boolean, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.enums import ShiftEnum, StatusEnum, ReconciliationStatusEnum, ApprovalStatusEnum


class Reconciliations(BaseModel):
    __tablename__ = "reconciliations"
    __table_args__ = (
        UniqueConstraint('company_id', 'date', 'shift', name='uq_reconciliation_company_date_shift'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", back_populates="reconciliations")
    
    date = Column(Date, nullable=False, index=True)
    shift = Column(Enum(ShiftEnum, name="shift_enum"), nullable=False, index=True)
    
    # Reconciliation workflow status
    reconciliation_status = Column(
        Enum(ReconciliationStatusEnum, name="reconciliation_status_enum"), 
        nullable=False, 
        default=ReconciliationStatusEnum.DRAFT,
        index=True,
        comment="Workflow status: DRAFT, CALCULATED, FINALIZED"
    )
    
    # Aggregated totals from source data
    total_float = Column(Numeric(18, 2), default=0, nullable=False, comment="Sum of all balances for this day/shift")
    total_cash = Column(Numeric(18, 2), default=0, nullable=False, comment="Cash count from cash_counts table")
    total_commissions = Column(Numeric(18, 2), default=0, nullable=False, comment="Sum of all commissions for this day/shift")
    
    # Calculated values
    expected_closing = Column(Numeric(18, 2), default=0, nullable=False, comment="Calculated expected closing balance")
    actual_closing = Column(Numeric(18, 2), default=0, nullable=False, comment="Actual closing from cash count")
    variance = Column(Numeric(18, 2), default=0, nullable=False, comment="Difference between expected and actual")
    
    # Status and approval
    status = Column(Enum(StatusEnum, name="status_enum"), nullable=False, default=StatusEnum.FLAGGED)
    approval_status = Column(
        Enum(ApprovalStatusEnum, name="approval_status_enum"), 
        nullable=False, 
        default=ApprovalStatusEnum.PENDING,
        index=True,
        comment="Approval status: PENDING, APPROVED, REJECTED"
    )
    reconciled_by = Column(Integer, ForeignKey('users.id'), nullable=True, comment="User who reconciled this record")
    reconciled_at = Column(DateTime, nullable=True, comment="Timestamp when reconciliation was completed")
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True, comment="User who approved/rejected this record")
    approved_at = Column(DateTime, nullable=True, comment="Timestamp when approval decision was made")
    rejection_reason = Column(Text, nullable=True, comment="Reason for rejection if status is REJECTED")
    is_finalized = Column(Boolean, default=False, nullable=False, comment="Lock after approval - prevents further changes")
    notes = Column(Text, nullable=True, comment="Optional notes or comments")
    
    # Relationships to linked data
    balances = relationship("Balance", back_populates="reconciliation", lazy="dynamic")
    commissions = relationship("Commissions", back_populates="reconciliation", lazy="dynamic")
    cash_counts = relationship("CashCount", back_populates="reconciliation", lazy="dynamic")
