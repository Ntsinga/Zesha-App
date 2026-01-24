from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.enums import RoleEnum


class User(BaseModel):
    """User model for storing Clerk user data in the backend."""
    __tablename__ = "users"

    # Company association - which company this user belongs to
    company_id = Column(Integer, ForeignKey('company_info.id', ondelete='RESTRICT'), index=True, nullable=True)
    company = relationship("CompanyInfo", back_populates="users")
    
    # Clerk identifier - unique and indexed
    clerk_user_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Basic user information
    email = Column(String(255), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Profile information
    profile_image_url = Column(String(500), nullable=True)
    phone_number = Column(String(50), nullable=True)
    
    # Business-specific fields
    role = Column(Enum(RoleEnum, values_callable=lambda x: [e.value for e in x]), nullable=True, default=RoleEnum.AGENT)
    
    # Status tracking
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional metadata (JSON storage for flexible data)
    user_metadata = Column(Text, nullable=True)  # Store JSON as text
    
    # Audit fields inherited from BaseModel:
    # - id (primary key)
    # - created_at
    # - updated_at
    
    def __repr__(self):
        return f"<User(clerk_user_id={self.clerk_user_id}, email={self.email})>"
