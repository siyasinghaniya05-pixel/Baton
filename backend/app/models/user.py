import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Boolean, Integer
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    LEAVER = "leaver"
    REVIEWER = "reviewer"
    SUCCESSOR = "successor"
    RESTRICTED_VIEWER = "restricted_viewer"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.SUCCESSOR, nullable=False)
    
    # Security & Verification Fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False) # True for seed/demo, enforced on new registrations
    verification_token = Column(String(100), nullable=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    
    # Account Lockout & Brute-force Protection
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    
    # Session Invalidation / Token Revocation
    tokens_revoked_before = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
