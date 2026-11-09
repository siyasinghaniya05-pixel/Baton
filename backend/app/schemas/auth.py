from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.user import UserRole

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str
    role: Optional[UserRole] = UserRole.SUCCESSOR

RegisterRequest = UserRegister

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class VerifyEmailRequest(BaseModel):
    token: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None

class ChangeRoleRequest(BaseModel):
    new_role: UserRole

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    full_name: str
    role: UserRole
    is_verified: bool = True

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool = True
    is_verified: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    message: str
    success: bool = True
