from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.user import UserRole
from app.models.project import SensitivityLevel

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    repository_url: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    repository_url: Optional[str] = None

class ProjectMemberAdd(BaseModel):
    user_id: str
    role: UserRole
    max_sensitivity: Optional[SensitivityLevel] = SensitivityLevel.INTERNAL

class ProjectMemberOut(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role: UserRole
    max_sensitivity: SensitivityLevel
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    repository_url: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    total_sources: int = 0
    total_claims: int = 0
    total_handovers: int = 0

    class Config:
        from_attributes = True

class AnalyticsOut(BaseModel):
    total_projects: int
    active_handovers: int
    pending_reviews: int
    approved_handovers: int
    missing_information: int
    conflicting_claims: int
    verified_claims: int
    evidence_backed_claims: int
    inferred_claims: int
    total_sources: int
    category_distribution: Dict[str, int]
    sensitivity_distribution: Dict[str, int]
    recent_activity: List[Dict[str, Any]]

