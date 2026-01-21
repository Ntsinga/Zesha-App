from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator, Field
from app.enums import RoleEnum


class UserBase(BaseModel):
    """Base schema for User with common fields."""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[RoleEnum] = RoleEnum.AGENT
    company_id: Optional[int] = None  # Company the user belongs to
    is_active: bool = True
    user_metadata: Optional[str] = None  # JSON string


class UserCreate(UserBase):
    """Schema for creating a new user (from Clerk webhook or sync)."""
    clerk_user_id: str

    @field_validator('clerk_user_id')
    @classmethod
    def validate_clerk_user_id(cls, v):
        if not v or not v.strip():
            raise ValueError('clerk_user_id cannot be empty')
        return v.strip()

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not v:
            raise ValueError('email cannot be empty')
        return v.lower()


class UserUpdate(BaseModel):
    """Schema for updating an existing user."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[RoleEnum] = None
    company_id: Optional[int] = None
    is_active: Optional[bool] = None
    last_login_at: Optional[datetime] = None
    user_metadata: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is not None:
            return v.lower()
        return v


class UserResponse(UserBase):
    """Schema for user responses."""
    id: int
    clerk_user_id: str
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpsert(UserCreate):
    """Schema for upserting a user (create if doesn't exist, update if exists)."""
    pass


class UserSyncRequest(BaseModel):
    """Schema for syncing user data from Clerk."""
    clerk_user_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    phone_number: Optional[str] = None
    user_metadata: Optional[str] = None


class UserInviteRequest(BaseModel):
    """Schema for inviting a new user via Clerk."""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[RoleEnum] = RoleEnum.AGENT
    redirect_url: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not v:
            raise ValueError('email cannot be empty')
        return v.lower()


class UserInviteResponse(BaseModel):
    """Schema for invitation response."""
    success: bool
    message: str
    clerk_user_id: Optional[str] = None
    invitation_id: Optional[str] = None
    email: str
    error: Optional[str] = None
