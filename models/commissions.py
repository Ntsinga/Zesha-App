from sqlalchemy import Column, String, DateTime, Numeric
from .base import BaseModel

class Commissions(BaseModel):
    __tablename__ = 'commissions'

    account = Column(String(100), index=True, nullable=False)
    amount = Column(Numeric(18,2), index=True, nullable=False)
    date = Column(DateTime, index=True, nullable=False)
