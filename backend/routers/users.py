from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import func
from datetime import datetime
import secrets
import string

from app.core.db import SessionLocal
from app.models.users import User
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserSyncRequest,
    UserUpsert,
    UserInviteRequest,
    UserInviteResponse
)
from app.services.notification_service import notification_service
from app.services.clerk_service import clerk_service

router = APIRouter(prefix="/users", tags=["users"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/sync", response_model=UserResponse, status_code=status.HTTP_200_OK)
def sync_user(payload: UserSyncRequest, db: Session = Depends(get_db)):
    """
    Sync user from Clerk (upsert pattern).
    Creates user if doesn't exist, updates if exists.
    This endpoint should be called on first login or from Clerk webhooks.
    """
    try:
        # Check if user exists (including soft-deleted users)
        existing_user = db.query(User).filter(
            User.clerk_user_id == payload.clerk_user_id
        ).first()
        
        if existing_user:
            # Update existing user
            update_data = payload.model_dump(exclude_unset=True, exclude={'clerk_user_id'})
            update_data['last_login_at'] = datetime.now()
            
            # If user was soft-deleted, restore them
            if existing_user.is_deleted:
                update_data['is_deleted'] = False
                update_data['deleted_at'] = None
            
            for field, value in update_data.items():
                setattr(existing_user, field, value)
            
            db.commit()
            db.refresh(existing_user)
            return existing_user
        else:
            # Create new user
            user_data = payload.model_dump()
            user_data['last_login_at'] = datetime.now()
            new_user = User(**user_data)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user
            
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"User with this email or clerk_user_id already exists"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/invite", response_model=UserInviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(payload: UserInviteRequest):
    """
    Invite a new user via Clerk.
    
    This endpoint:
    1. Creates a user in Clerk
    2. Sends Clerk invitation email automatically (user sets their own password)
    3. User will be synced to backend database on first login via /sync endpoint
    
    The user won't exist in the backend database until they accept the invitation
    and log in for the first time, triggering the sync.
    
    Clerk handles the invitation email - no custom email is sent.
    """
    try:
        # Create user in Clerk and send invitation (Clerk handles the email)
        result = await clerk_service.invite_user(
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone_number=payload.phone_number,
            redirect_url=payload.redirect_url
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create invitation")
            )
        
        return UserInviteResponse(
            success=True,
            message="Invitation sent via Clerk. User will be synced on first login.",
            clerk_user_id=result["clerk_user_id"],
            invitation_id=result.get("invitation_id"),
            email=payload.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to invite user: {str(e)}"
        )


@router.get("/", response_model=List[UserResponse])
def list_users(
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all users with optional filtering. Requires company_id for multi-tenancy."""
    query = db.query(User).filter(
        User.is_deleted == False,
        User.company_id == company_id
    )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if role is not None:
        query = query.filter(User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/clerk/{clerk_user_id}", response_model=UserResponse)
def get_user_by_clerk_id(
    clerk_user_id: str,
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    db: Session = Depends(get_db)
):
    """Get user by Clerk user ID. Requires company_id for multi-tenancy."""
    user = db.query(User).filter(
        User.clerk_user_id == clerk_user_id,
        User.company_id == company_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with clerk_user_id '{clerk_user_id}' not found in this company"
        )
    
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    db: Session = Depends(get_db)
):
    """Get user by internal ID. Requires company_id for multi-tenancy."""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {user_id} not found in this company"
        )
    
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    db: Session = Depends(get_db)
):
    """Update user by internal ID. Requires company_id for multi-tenancy."""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {user_id} not found in this company"
        )
    
    try:
        update_data = payload.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    db: Session = Depends(get_db)
):
    """
    Soft delete user by internal ID.
    Sets is_deleted=True and deleted_at timestamp.
    Requires company_id for multi-tenancy.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {user_id} not found in this company"
        )
    
    try:
        user.is_deleted = True
        user.deleted_at = func.now()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    db: Session = Depends(get_db)
):
    """Soft delete - deactivate user instead of deleting. Requires company_id for multi-tenancy."""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {user_id} not found in this company"
        )
    
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    company_id: int = Query(..., description="Company ID for multi-tenant filtering"),
    db: Session = Depends(get_db)
):
    """Reactivate a deactivated user. Requires company_id for multi-tenancy."""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {user_id} not found in this company"
        )
    
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user
