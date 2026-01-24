from sqlalchemy import Column, String, Boolean, Text, Enum, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.enums import AccountTypeEnum


class Account(BaseModel):
    """Model for bank/financial accounts like STANBIC, FNB, etc."""
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint('company_id', 'name', name='uq_account_company_name'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", back_populates="accounts")
    
    name = Column(String(100), index=True, nullable=False)  # Unique within company only
    description = Column(Text, nullable=True)
    account_type = Column(Enum(AccountTypeEnum), index=True, nullable=False)
    is_active = Column(Boolean, default=True, index=True, nullable=False)
    
    # Relationships
    balances = relationship("Balance", back_populates="account")
    commissions = relationship("Commissions", back_populates="account")
    reported_balances = relationship("ReportBalances", back_populates="account")
    reported_totals = relationship("ReportedTotals", back_populates="account")
