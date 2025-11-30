from sqlalchemy import Column, String, Numeric, DateTime, Text
from datetime import datetime
from .base import BaseModel


class Expense(BaseModel):
    __tablename__ = 'expenses'

    name = Column(String(255), nullable=False, index=True)
    amount = Column(Numeric(18, 2), nullable=False)
    description = Column(Text, nullable=True)
    expense_date = Column(DateTime, nullable=False, default=datetime.now, index=True)
    category = Column(String(100), nullable=True, index=True)
