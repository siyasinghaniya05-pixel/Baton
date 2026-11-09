import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.database import Base

class GapStatus(str, enum.Enum):
    PENDING = "pending"
    ANSWERED = "answered"
    SKIPPED = "skipped"
    UNKNOWN = "marked_unknown"

class GapType(str, enum.Enum):
    MISSING_OWNERSHIP = "missing_ownership"
    UNKNOWN_DEPLOYMENT = "unknown_deployment"
    UNCONFIRMED_DEADLINE = "unconfirmed_deadline"
    ACCOUNT_RESPONSIBILITY = "account_responsibility"
    UNRESOLVED_DEPENDENCY = "unresolved_dependency"
    CONFLICTING_DECISION = "conflicting_decision"

class GapQuestion(Base):
    __tablename__ = "gap_questions"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    context_category = Column(String(100), nullable=False)
    detected_gap_type = Column(Enum(GapType), nullable=False)
    priority = Column(Integer, default=1, nullable=False)  # 1 = High, 2 = Medium, 3 = Low
    status = Column(Enum(GapStatus), default=GapStatus.PENDING, nullable=False)
    target_role = Column(String(50), default="leaver", nullable=False)
    linked_claim_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="gap_questions")
    answers = relationship("GapAnswer", back_populates="question", cascade="all, delete-orphan")

class GapAnswer(Base):
    __tablename__ = "gap_answers"

    id = Column(String(36), primary_key=True, index=True)
    question_id = Column(String(36), ForeignKey("gap_questions.id"), nullable=False, index=True)
    answered_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    answer_text = Column(Text, nullable=False)
    attached_evidence_source_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    question = relationship("GapQuestion", back_populates="answers")
    user = relationship("User")

