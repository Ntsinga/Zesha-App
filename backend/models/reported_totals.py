from sqlalchemy import Column, String, DateTime, Numeric, Enum, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.enums import ShiftEnum


class ReportedTotals(BaseModel):
    __tablename__ = 'reported_totals'
    __table_args__ = (
        Index('ix_reported_totals_company_date', 'company_id', 'submitted_at'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", backref="reported_totals")
    
    shift = Column(Enum(ShiftEnum, name="shift_enum"),index=True, nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='RESTRICT'), index=True, nullable=False)
    account = relationship("Account", back_populates="reported_totals")
    reported_total_float = Column(Numeric(18,2), nullable=False)
    reported_total_cash = Column(Numeric(18,2), nullable=False)
    reported_grand_total =Column(Numeric(18,2), nullable=False)
    file_name = Column(String, index=True, nullable=False)
    file_url = Column(String, index=True, nullable=False)
    sha256 = Column(String(44), index=True, nullable=False, unique=True)
    source = Column(String(50), index=True, nullable=False)
    submitted_at = Column(DateTime, nullable=False)
    submitted_by = Column(String(200), nullable=True)

