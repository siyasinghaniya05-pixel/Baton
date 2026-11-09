from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.user import UserRole

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[UserRole] = UserRole.SUCCESSOR

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    full_name: str
    role: UserRole

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True
