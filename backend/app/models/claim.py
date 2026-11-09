import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.project import SensitivityLevel

class ClaimStatus(str, enum.Enum):
    VERIFIED = "Verified"
    EVIDENCE_BACKED = "Evidence-backed"
    INFERRED = "Inferred"
    CONFLICT = "Conflict"
    MISSING = "Missing"
    UNVERIFIED = "Unverified"

class ClaimCategory(str, enum.Enum):
    DECISION = "Decision"
    DECISION_REASONING = "Decision Reasoning"
    TASK_OWNERSHIP = "Task Ownership"
    PENDING_TASK = "Pending Task"
    DEPENDENCY = "Dependency"
    BLOCKER = "Blocker"
    RISK = "Risk"
    RECURRING_PROBLEM = "Recurring Problem"
    CONTACT = "Important Contact"
    DEPLOYMENT_ACCESS = "Deployment & Access"
    TIMELINE_MILESTONE = "Timeline Milestone"
    OPEN_QUESTION = "Open Question"

class ReviewState(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EDITED = "edited"
    REJECTED = "rejected"

class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    category = Column(Enum(ClaimCategory), nullable=False)
    description = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=True)
    exact_quote = Column(Text, nullable=True)  # Exact verbatim quote from source
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    chunk_id = Column(String(64), ForeignKey("source_chunks.id"), nullable=True)
    evidence_location = Column(String(255), nullable=True)  # e.g. "README.md:14" or "Meeting-1.pdf, p.2"
    confidence = Column(Float, default=1.0, nullable=False)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.EVIDENCE_BACKED, nullable=False)
    sensitivity = Column(Enum(SensitivityLevel), default=SensitivityLevel.INTERNAL, nullable=False)
    review_state = Column(Enum(ReviewState), default=ReviewState.PENDING, nullable=False)
    reviewer_notes = Column(Text, nullable=True)
    conflict_claim_id = Column(String(36), nullable=True)  # Links to opposing conflicting claim
    event_timestamp = Column(DateTime, nullable=True)  # For timeline chronological sorting
    
    # Multi-Stage Verification Pipeline Report
    verification_report = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="claims")
    evidence_spans = relationship("EvidenceSpan", back_populates="claim", cascade="all, delete-orphan")

class EvidenceSpan(Base):
    __tablename__ = "evidence_spans"

    id = Column(String(36), primary_key=True, index=True)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False, index=True)
    chunk_id = Column(String(64), ForeignKey("source_chunks.id"), nullable=False)
    quote = Column(Text, nullable=False)
    char_start = Column(Float, nullable=True)
    char_end = Column(Float, nullable=True)
    verified_deterministic = Column(Boolean, default=False, nullable=False)
    semantic_support_score = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    claim = relationship("Claim", back_populates="evidence_spans")
