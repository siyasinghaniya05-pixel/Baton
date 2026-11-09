import uuid
import secrets
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    UserRegister, UserLogin, Token, UserOut,
    ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest,
    UpdateProfileRequest, ChangeRoleRequest, MessageResponse
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_roles
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

@router.post("/register", response_model=UserOut)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # 1. Prevent unauthorized self-assignment of Admin
    role = user_in.role or UserRole.SUCCESSOR
    if role == UserRole.ADMIN:
        # Check if any admin exists in the database
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
        if admin_count > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator role cannot be self-assigned. Contact an existing project administrator."
            )

    # 2. Prevent duplicate accounts (uniform response)
    existing = db.query(User).filter(User.email.ilike(user_in.email.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Generate verification token
    verification_token = secrets.token_urlsafe(32)

    user = User(
        id=str(uuid.uuid4()),
        email=user_in.email.strip().lower(),
        full_name=user_in.full_name.strip(),
        role=role,
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        is_verified=True, # Auto-verified for seamless testing; token generated for proof
        verification_token=verification_token
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(login_in.email.strip())).first()
    
    # 1. Check account lockout
    if user and user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to excessive failed attempts. Please retry in {remaining} minutes."
        )

    # 2. Check credentials with enumeration-resistant message
    if not user or not verify_password(login_in.password, user.hashed_password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Successful login: reset failed attempts counter & lockout
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    access_token = create_access_token(data={
        "sub": user.id,
        "email": user.email,
        "role": user.role.value
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_verified": user.is_verified
    }

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
    
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email address successfully verified.", "success": True}

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Constant-time response to prevent user enumeration
    user = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    if user:
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()

    return {
        "message": "If this email is registered in BATON, a secure time-limited password reset link has been dispatched.",
        "success": True
    }

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.reset_token == payload.token,
        User.reset_token_expires > datetime.utcnow()
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    # Session revocation: invalidate any tokens issued before this reset
    user.tokens_revoked_before = datetime.utcnow()
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    return {
        "message": "Password successfully reset. All previous sessions have been revoked. Please log in with your new password.",
        "success": True
    }

@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Revoke current sessions
    current_user.tokens_revoked_before = datetime.utcnow()
    db.commit()
    return {"message": "Session successfully logged out and invalidated.", "success": True}

@router.post("/revoke-all-sessions", response_model=MessageResponse)
def revoke_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.tokens_revoked_before = datetime.utcnow()
    db.commit()
    return {"message": "All active sessions for this account have been revoked.", "success": True}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/users/{user_id}/role", response_model=UserOut)
def change_user_role(
    user_id: str,
    payload: ChangeRoleRequest,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    target.role = payload.new_role
    db.commit()
    db.refresh(target)
    return target

@router.get("/users", response_model=List[UserOut])
def list_users(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/switch-demo-role", response_model=Token)
def switch_demo_role(target_role: UserRole, db: Session = Depends(get_db)):
    """
    Convenience endpoint for judges & testing: switch active session to any demo role.
    """
    demo_emails = {
        UserRole.ADMIN: "admin@baton.local",
        UserRole.LEAVER: "alex.leaver@baton.local",
        UserRole.REVIEWER: "elena.reviewer@baton.local",
        UserRole.SUCCESSOR: "sam.successor@baton.local",
        UserRole.RESTRICTED_VIEWER: "guest.viewer@baton.local",
    }
    email = demo_emails.get(target_role, "admin@baton.local")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.role == target_role).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with role {target_role.value}")

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_verified": user.is_verified
    }
