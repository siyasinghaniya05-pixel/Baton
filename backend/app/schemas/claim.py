from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.claim import ClaimCategory, ClaimStatus, ReviewState
from app.models.project import SensitivityLevel

class EvidenceSpanOut(BaseModel):
    id: str
    chunk_id: str
    quote: str
    char_start: Optional[float] = None
    char_end: Optional[float] = None
    verified_deterministic: bool
    semantic_support_score: float

    class Config:
        from_attributes = True

class ClaimCreate(BaseModel):
    project_id: str
    category: ClaimCategory
    description: str
    reasoning: Optional[str] = None
    exact_quote: Optional[str] = None
    source_id: Optional[str] = None
    chunk_id: Optional[str] = None
    evidence_location: Optional[str] = None
    confidence: float = 1.0
    status: ClaimStatus = ClaimStatus.EVIDENCE_BACKED
    sensitivity: SensitivityLevel = SensitivityLevel.INTERNAL

class ClaimUpdate(BaseModel):
    description: Optional[str] = None
    reasoning: Optional[str] = None
    reviewer_notes: Optional[str] = None
    status: Optional[ClaimStatus] = None
    sensitivity: Optional[SensitivityLevel] = None

class ClaimReviewAction(BaseModel):
    action: ReviewState  # accepted, edited, rejected
    reviewer_notes: Optional[str] = None
    edited_description: Optional[str] = None

class ClaimOut(BaseModel):
    id: str
    project_id: str
    category: ClaimCategory
    description: str
    reasoning: Optional[str] = None
    exact_quote: Optional[str] = None
    source_id: Optional[str] = None
    chunk_id: Optional[str] = None
    evidence_location: Optional[str] = None
    confidence: float
    status: ClaimStatus
    sensitivity: SensitivityLevel
    review_state: ReviewState
    reviewer_notes: Optional[str] = None
    conflict_claim_id: Optional[str] = None
    event_timestamp: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    evidence_spans: List[EvidenceSpanOut] = []

    class Config:
        from_attributes = True

