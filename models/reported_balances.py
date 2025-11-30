from sqlalchemy import Column, String, DateTime, Numeric, Enum
from .base import BaseModel
from app.enums import ShiftEnum


class ReportBalances(BaseModel):
    __tablename__ = 'reported_balances'

    account = Column(String(100), index=True, nullable=False)
    shift = Column(Enum(ShiftEnum, name="shift_enum"), index=True, nullable=False)
    amount = Column(Numeric(18,2), index=True, nullable=False)
    file_name = Column(String(255), index=True, nullable=False)
    file_url = Column(String(2048), index=True, nullable=False)
    sha256 = Column(String(44), index=True, nullable=False, unique=True)
    source = Column(String(50), index=True, nullable=False)
    submitted_at = Column(DateTime, index=True, nullable=False)
    submitted_by = Column(String(200), index=True, nullable=True)


