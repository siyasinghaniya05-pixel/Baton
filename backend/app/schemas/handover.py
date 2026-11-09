from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.user import UserRole
from app.models.handover import HandoverStatus, Timeframe

class ContinuationActionOut(BaseModel):
    id: str
    timeframe: Timeframe
    title: str
    description: str
    assigned_to: Optional[str] = None
    linked_claim_id: Optional[str] = None
    priority: str
    is_verified: bool

    class Config:
        from_attributes = True

class ComprehensionCheckOut(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option_index: int
    explanation: Optional[str] = None
    linked_claim_id: Optional[str] = None

    class Config:
        from_attributes = True

class HandoverViewOut(BaseModel):
    id: str
    target_role: UserRole
    compiled_content: Dict[str, Any]
    sensitive_items_count: int
    redacted_placeholders_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class HandoverVersionCreate(BaseModel):
    title: str
    executive_summary: Optional[str] = None

class HandoverVersionOut(BaseModel):
    id: str
    project_id: str
    version_number: int
    title: str
    executive_summary: str
    status: HandoverStatus
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    published_share_token: Optional[str] = None
    share_expires_at: Optional[datetime] = None
    created_at: datetime
    views: List[HandoverViewOut] = []
    actions: List[ContinuationActionOut] = []
    comprehension_checks: List[ComprehensionCheckOut] = []

    class Config:
        from_attributes = True

class AcknowledgementCreate(BaseModel):
    quiz_answers: List[int]
    successor_comments: Optional[str] = None

class AcknowledgementOut(BaseModel):
    id: str
    handover_version_id: str
    successor_id: str
    signed_at: datetime
    quiz_passed: bool
    quiz_score: int
    receipt_hash: str
    successor_comments: Optional[str] = None

    class Config:
        from_attributes = True

