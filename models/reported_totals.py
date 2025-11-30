from sqlalchemy import Column, String, DateTime, Numeric, Enum
from .base import BaseModel
from app.enums import ShiftEnum


class ReportedTotals(BaseModel):
    __tablename__ = 'reported_totals'

    shift = Column(Enum(ShiftEnum, name="shift_enum"),index=True, nullable=False)
    account = Column(String(100),index=True, nullable=False)
    reported_total_float = Column(Numeric(18,2), nullable=False)
    reported_total_cash = Column(Numeric(18,2), nullable=False)
    reported_grand_total =Column(Numeric(18,2), nullable=False)
    file_name = Column(String, index=True, nullable=False)
    file_url = Column(String, index=True, nullable=False)
    sha256 = Column(String(44), index=True, nullable=False, unique=True)
    source = Column(String(50), index=True, nullable=False)
    submitted_at = Column(DateTime, nullable=False)
    submitted_by = Column(String(200), nullable=True)

