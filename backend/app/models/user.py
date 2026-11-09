import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum
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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

