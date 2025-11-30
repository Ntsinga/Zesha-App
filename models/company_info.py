from sqlalchemy import Column, String, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY
from .base import BaseModel


class CompanyInfo(BaseModel):
    __tablename__ = 'company_info'

    name = Column(String(255), nullable=False, unique=True, index=True)
    emails = Column(ARRAY(String), nullable=True)  # Array of email strings
    total_working_capital = Column(Numeric(18, 2), nullable=False, default=0)
    outstanding_balance = Column(Numeric(18, 2), nullable=False, default=0)
    description = Column(Text, nullable=True)
