import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class RiskSeverity(str):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RiskCategory(str):
    KNOWLEDGE_CONCENTRATION = "knowledge_concentration"
    OWNERSHIP_RISK = "ownership_risk"
    DEADLINE_RISK = "deadline_risk"
    DEPENDENCY_RISK = "dependency_risk"
    DOCUMENTATION_RISK = "documentation_risk"
    SECURITY_RISK = "security_risk"
    TECHNICAL_DEBT = "technical_debt"
    UNRESOLVED_DECISIONS = "unresolved_decisions"

class RiskFinding(Base):
    __tablename__ = "risk_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), default=RiskSeverity.MEDIUM)
    description = Column(Text, nullable=False)
    affected_entity = Column(String(255), nullable=True) # e.g. "Kafka Pipeline", "Auth Module", "Elena Rostova"
    mitigation = Column(Text, nullable=False)
    resolution_status = Column(String(30), default="open") # open, mitigating, resolved
    evidence_reference = Column(Text, nullable=True)
    claim_id = Column(String(36), ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", backref="risk_findings")
    claim = relationship("Claim", backref="linked_risks")


class DecisionRecord(Base):
    __tablename__ = "decision_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    what_decided = Column(Text, nullable=False)
    participants = Column(JSON, default=list) # List of participant names
    decided_date = Column(String(50), nullable=True)
    why_selected = Column(Text, nullable=False)
    alternatives_considered = Column(JSON, default=list) # List of alternative descriptions
    concerns_raised = Column(JSON, default=list) # List of concerns raised
    evidence_quote = Column(Text, nullable=True)
    evidence_location = Column(String(255), nullable=True)
    reversal_status = Column(String(50), default="active") # active, modified, reversed, deprecated
    reasoning_missing = Column(Boolean, default=False) # explicitly marked if reasoning unestablished
    source_id = Column(String(36), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="decision_records")
    source = relationship("Source", backref="decisions")


class BusFactorItem(Base):
    __tablename__ = "bus_factor_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    person_name = Column(String(255), nullable=False)
    role_title = Column(String(255), nullable=False)
    critical_area = Column(String(255), nullable=False)
    contributor_count = Column(Integer, default=1) # 1 means pure single-point-of-failure
    backup_owner = Column(String(255), nullable=True) # None or name
    documentation_health = Column(String(30), default="poor") # poor, fair, good
    urgency_level = Column(String(20), default="high") # critical, high, medium, low
    risk_impact = Column(Text, nullable=False)
    recommended_handoff = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="bus_factor_items")


class LivingRunbook(Base):
    __tablename__ = "living_runbooks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False) # setup, deployment, troubleshooting, recurring, emergency
    description = Column(Text, nullable=True)
    content_markdown = Column(Text, nullable=False)
    prerequisites = Column(JSON, default=list)
    commands = Column(JSON, default=list)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", backref="living_runbooks")


class SuccessorMission(Base):
    __tablename__ = "successor_missions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    mission_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    objective = Column(Text, nullable=False)
    estimated_minutes = Column(Integer, default=30)
    instructions_markdown = Column(Text, nullable=False)
    completion_criteria = Column(JSON, default=list)
    status = Column(String(30), default="pending") # pending, in_progress, completed
    successor_notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="successor_missions")


class CollaborationComment(Base):
    __tablename__ = "collaboration_comments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    claim_id = Column(String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=True)
    runbook_id = Column(String(36), ForeignKey("living_runbooks.id", ondelete="CASCADE"), nullable=True)
    author_name = Column(String(255), nullable=False)
    author_role = Column(String(50), nullable=False) # leaver, reviewer, successor, admin
    comment_text = Column(Text, nullable=False)
    status_tag = Column(String(50), default="general") # clarification, blocker, resolved, objection
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="collaboration_comments")
    claim = relationship("Claim", backref="comments")


class SourceReliabilityScore(Base):
    __tablename__ = "source_reliability_scores"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, unique=True)
    freshness_score = Column(Float, default=1.0) # 0.0 to 1.0
    authority_score = Column(Float, default=1.0)
    completeness_score = Column(Float, default=1.0)
    corroboration_score = Column(Float, default=1.0)
    overall_score = Column(Float, default=1.0)
    contradictions_detected = Column(Integer, default=0)
    rationale = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", backref="reliability_metric")
