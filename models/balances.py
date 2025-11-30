
from sqlalchemy import Column, String, DateTime, Numeric, Enum
from .base import BaseModel
from app.enums import ShiftEnum


class Balance(BaseModel):
    __tablename__ = "balances"

    account = Column(String(100), index=True, nullable=False)
    shift = Column(Enum(ShiftEnum, name="shift_enum"), index=True, nullable=False)
    amount = Column(Numeric(18,2), index=True, nullable=False)
    image_url = Column(String(2048), index=True, nullable=False)
    media_id = Column(String(128), index=True, nullable=False, unique=True)
    message_id = Column(String(128), index=True, nullable=False, unique=True)
    source = Column(String(50), index=True, nullable=False)
    sha256 = Column(String(44), index=True, nullable=False,unique=True)
    date = Column(DateTime, index=True, nullable=False)

