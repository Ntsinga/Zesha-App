from sqlalchemy import Column, Integer, Numeric, Date, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.enums import ShiftEnum


class CashCount(BaseModel):
    """Model for tracking cash denominations count."""
    __tablename__ = "cash_counts"
    __table_args__ = (
        Index('ix_cash_counts_company_date', 'company_id', 'date'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", back_populates="cash_counts")
    
    reconciliation_id = Column(Integer, ForeignKey('reconciliations.id', ondelete='SET NULL'), index=True, nullable=True)
    reconciliation = relationship("Reconciliations", back_populates="cash_counts")
    
    denomination = Column(Numeric(10, 2), nullable=False, index=True)  # e.g., 100.00, 50.00, 20.00
    quantity = Column(Integer, nullable=False)  # Number of notes/coins
    amount = Column(Numeric(12, 2), nullable=False)  # denomination * quantity
    date = Column(Date, nullable=False, index=True)
    shift = Column(Enum(ShiftEnum), nullable=False, index=True)
