from sqlalchemy import Column, String, DateTime, Numeric, Enum, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.enums import ShiftEnum, SourceEnum

class Commissions(BaseModel):
    __tablename__ = 'commissions'
    __table_args__ = (
        Index('ix_commissions_account_date_shift', 'account_id', 'date', 'shift'),
        Index('ix_commissions_company_date', 'company_id', 'date'),
    )

    # Company association
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=False)
    company = relationship("CompanyInfo", back_populates="commissions")
    
    reconciliation_id = Column(Integer, ForeignKey('reconciliations.id', ondelete='SET NULL'), index=True, nullable=True)
    reconciliation = relationship("Reconciliations", back_populates="commissions")
    
    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='RESTRICT'), index=True, nullable=False)
    account = relationship("Account", back_populates="commissions")
    shift = Column(Enum(ShiftEnum, name="shift_enum"), index=True, nullable=False)
    amount = Column(Numeric(18,2), index=True, nullable=False)
    image_url = Column(String(2048), index=True, nullable=False)
    media_id = Column(String(128), index=True, nullable=True, unique=True)  # WhatsApp only
    message_id = Column(String(128), index=True, nullable=True, unique=True)  # WhatsApp only
    source = Column(Enum(SourceEnum, values_callable=lambda x: [e.value for e in x], name="source_enum"), index=True, nullable=False)
    sha256 = Column(String(44), index=True, nullable=True, unique=True)  # Can be auto-generated
    date = Column(DateTime, index=True, nullable=False)
    image_data = Column(String, nullable=True)  # Store base64 encoded image data
