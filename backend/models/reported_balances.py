from sqlalchemy import Column, String, DateTime, Numeric, Enum, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.enums import ShiftEnum


class ReportBalances(BaseModel):
    __tablename__ = 'reported_balances'
    __table_args__ = (
        Index('ix_reported_balances_company_date', 'company_id', 'submitted_at'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", backref="reported_balances")
    
    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='RESTRICT'), index=True, nullable=False)
    account = relationship("Account", back_populates="reported_balances")
    shift = Column(Enum(ShiftEnum, name="shift_enum"), index=True, nullable=False)
    amount = Column(Numeric(18,2), index=True, nullable=False)
    file_name = Column(String(255), index=True, nullable=False)
    file_url = Column(String(2048), index=True, nullable=False)
    sha256 = Column(String(44), index=True, nullable=False, unique=True)
    source = Column(String(50), index=True, nullable=False)
    submitted_at = Column(DateTime, index=True, nullable=False)
    submitted_by = Column(String(200), index=True, nullable=True)


