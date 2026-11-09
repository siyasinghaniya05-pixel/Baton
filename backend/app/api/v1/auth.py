import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, Token, UserOut
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user = User(
        id=str(uuid.uuid4()),
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role or UserRole.SUCCESSOR,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role.value})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

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
        # Fallback to any user with that role
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
        "role": user.role
    }

