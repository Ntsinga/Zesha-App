from sqlalchemy import Column, String, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from .base import BaseModel


class CompanyInfo(BaseModel):
    __tablename__ = 'company_info'

    name = Column(String(255), nullable=False, unique=True, index=True)
    emails = Column(ARRAY(String), nullable=True)  # Array of email strings
    total_working_capital = Column(Numeric(18, 2), nullable=False, default=0)
    outstanding_balance = Column(Numeric(18, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default='UGX')  # ISO 4217 currency code
    description = Column(Text, nullable=True)
    
    # Relationships - all entities belonging to this company
    users = relationship("User", back_populates="company", lazy="dynamic")
    accounts = relationship("Account", back_populates="company", lazy="dynamic")
    reconciliations = relationship("Reconciliations", back_populates="company", lazy="dynamic")
    commissions = relationship("Commissions", back_populates="company", lazy="dynamic")
    balances = relationship("Balance", back_populates="company", lazy="dynamic")
    expenses = relationship("Expense", back_populates="company", lazy="dynamic")
    cash_counts = relationship("CashCount", back_populates="company", lazy="dynamic")
