from sqlalchemy import Column, String, Date, DateTime, Numeric, Enum
from .base import BaseModel
from app.enums import ShiftEnum


class Reconciliations(BaseModel):
    __tablename__ = "reconciliations"

    date = Column(Date, nullable=False)
    shift = Column(Enum(ShiftEnum, name="shift_enum"), nullable=False)
    calc_total_float = Column(Numeric(18, 2), default=0)
    calc_total_cash = Column(Numeric(18, 2), default=0)
    calc_grand_total = Column(Numeric(18, 2), default=0)
    rep_total_float = Column(Numeric(18, 2), default=0)
    rep_total_cash = Column(Numeric(18, 2), default=0)
    rep_grand_total = Column(Numeric(18, 2), default=0)
    variance_float = Column(Numeric(18, 2), default=0)
    variance_cash = Column(Numeric(18, 2), default=0)
    variance_grand = Column(Numeric(18, 2), default=0)
    
    # Financial reconciliation fields
    total_working_capital = Column(Numeric(18, 2), default=0)
    outstanding_balance = Column(Numeric(18, 2), default=0)
    total_expenses = Column(Numeric(18, 2), default=0)
    expected_grand_total = Column(Numeric(18, 2), default=0)  # working_capital - outstanding - expenses
    capital_variance = Column(Numeric(18, 2), default=0)  # rep_grand_total - expected_grand_total

    status = Column(String(20), nullable=False)           # e.g. PASSED / FAILED
    reviewer = Column(String(100), nullable=True)         # username/email/etc.
    reviewed_at = Column(DateTime, nullable=True)         # timestamp when reviewed

    run_key = Column(String(50), unique=True, index=True, nullable=False)  # 2025-08-30-AM
