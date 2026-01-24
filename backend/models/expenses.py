from sqlalchemy import Column, String, Numeric, DateTime, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class Expense(BaseModel):
    __tablename__ = 'expenses'
    __table_args__ = (
        Index('ix_expenses_company_date', 'company_id', 'expense_date'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", back_populates="expenses")
    
    name = Column(String(255), nullable=False, index=True)
    amount = Column(Numeric(18, 2), nullable=False)
    description = Column(Text, nullable=True)
    expense_date = Column(DateTime, nullable=False, default=datetime.now, index=True)
    category = Column(String(100), nullable=True, index=True)
