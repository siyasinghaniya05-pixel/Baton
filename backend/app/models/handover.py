import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Integer, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import UserRole

class HandoverStatus(str, enum.Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Timeframe(str, enum.Enum):
    DAY_1 = "Day 1"
    WEEK_1 = "Week 1"
    DAY_30 = "Day 30"

class HandoverVersion(Base):
    __tablename__ = "handover_versions"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    title = Column(String(255), nullable=False)
    executive_summary = Column(Text, nullable=False)
    status = Column(Enum(HandoverStatus), default=HandoverStatus.DRAFT, nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    published_share_token = Column(String(64), unique=True, index=True, nullable=True)
    share_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="handovers")
    views = relationship("HandoverView", back_populates="handover_version", cascade="all, delete-orphan")
    actions = relationship("ContinuationAction", back_populates="handover_version", cascade="all, delete-orphan")
    acknowledgements = relationship("Acknowledgement", back_populates="handover_version", cascade="all, delete-orphan")
    comprehension_checks = relationship("ComprehensionCheck", back_populates="handover_version", cascade="all, delete-orphan")

class HandoverView(Base):
    """
    Role-partitioned handover view compiled ONLY from permitted evidence.
    """
    __tablename__ = "handover_views"

    id = Column(String(36), primary_key=True, index=True)
    handover_version_id = Column(String(36), ForeignKey("handover_versions.id"), nullable=False, index=True)
    target_role = Column(Enum(UserRole), nullable=False)
    compiled_content = Column(JSON, nullable=False)  # Structured role-specific document
    sensitive_items_count = Column(Integer, default=0, nullable=False)
    redacted_placeholders_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    handover_version = relationship("HandoverVersion", back_populates="views")

class ContinuationAction(Base):
    __tablename__ = "continuation_actions"

    id = Column(String(36), primary_key=True, index=True)
    handover_version_id = Column(String(36), ForeignKey("handover_versions.id"), nullable=False, index=True)
    timeframe = Column(Enum(Timeframe), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    assigned_to = Column(String(255), nullable=True)
    linked_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    priority = Column(String(20), default="high", nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    handover_version = relationship("HandoverVersion", back_populates="actions")
    claim = relationship("Claim")

class Acknowledgement(Base):
    __tablename__ = "acknowledgements"

    id = Column(String(36), primary_key=True, index=True)
    handover_version_id = Column(String(36), ForeignKey("handover_versions.id"), nullable=False, index=True)
    successor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    signed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    quiz_passed = Column(Boolean, default=True, nullable=False)
    quiz_score = Column(Integer, default=100, nullable=False)
    receipt_hash = Column(String(64), nullable=False)
    successor_comments = Column(Text, nullable=True)

    handover_version = relationship("HandoverVersion", back_populates="acknowledgements")
    user = relationship("User")

class ComprehensionCheck(Base):
    __tablename__ = "comprehension_checks"

    id = Column(String(36), primary_key=True, index=True)
    handover_version_id = Column(String(36), ForeignKey("handover_versions.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of strings
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=True)
    linked_claim_id = Column(String(36), nullable=True)

    handover_version = relationship("HandoverVersion", back_populates="comprehension_checks")

