from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.gap_interview import GapStatus, GapType

class GapAnswerCreate(BaseModel):
    answer_text: str
    attached_evidence_source_id: Optional[str] = None

class GapAnswerOut(BaseModel):
    id: str
    question_id: str
    answered_by: str
    answer_text: str
    attached_evidence_source_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GapQuestionOut(BaseModel):
    id: str
    project_id: str
    question_text: str
    context_category: str
    detected_gap_type: GapType
    priority: int
    status: GapStatus
    target_role: str
    linked_claim_id: Optional[str] = None
    created_at: datetime
    answers: List[GapAnswerOut] = []

    class Config:
        from_attributes = True

