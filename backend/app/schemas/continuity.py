from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

# --- Readiness Score Schemas ---
class CategoryScore(BaseModel):
    category: str
    weight: float
    score: float
    max_score: float
    status: str
    rationale: str

class DeductionDetail(BaseModel):
    category: str
    points_deducted: float
    reason: str
    remediation_action: str

class ReadinessResponse(BaseModel):
    project_id: str
    overall_score: float
    readiness_grade: str # Ready, High Confidence, At Risk, Blocked
    is_deployable: bool
    critical_blockers_count: int
    unresolved_conflicts_count: int
    missing_gaps_count: int
    categories: List[CategoryScore]
    deductions: List[DeductionDetail]
    recommended_actions: List[str]

# --- Risk Radar Schemas ---
class RiskFindingResponse(BaseModel):
    id: str
    project_id: str
    category: str
    title: str
    severity: str
    description: str
    affected_entity: Optional[str] = None
    mitigation: str
    resolution_status: str
    evidence_reference: Optional[str] = None
    claim_id: Optional[str] = None
    created_at: Optional[datetime] = None

class RiskFindingCreate(BaseModel):
    category: str
    title: str
    severity: str
    description: str
    affected_entity: Optional[str] = None
    mitigation: str
    resolution_status: Optional[str] = "open"
    evidence_reference: Optional[str] = None

class RiskRadarSummary(BaseModel):
    total_risks: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    by_category: Dict[str, int]
    findings: List[RiskFindingResponse]

# --- Decision Archaeology Schemas ---
class DecisionRecordResponse(BaseModel):
    id: str
    project_id: str
    title: str
    what_decided: str
    participants: List[str]
    decided_date: Optional[str] = None
    why_selected: str
    alternatives_considered: List[str]
    concerns_raised: List[str]
    evidence_quote: Optional[str] = None
    evidence_location: Optional[str] = None
    reversal_status: str
    reasoning_missing: bool
    source_id: Optional[str] = None

class DecisionCreate(BaseModel):
    title: str
    what_decided: str
    participants: List[str] = []
    decided_date: Optional[str] = None
    why_selected: str
    alternatives_considered: List[str] = []
    concerns_raised: List[str] = []
    evidence_quote: Optional[str] = None
    evidence_location: Optional[str] = None
    reversal_status: Optional[str] = "active"
    reasoning_missing: Optional[bool] = False

# --- Bus Factor Schemas ---
class BusFactorItemResponse(BaseModel):
    id: str
    project_id: str
    person_name: str
    role_title: str
    critical_area: str
    contributor_count: int
    backup_owner: Optional[str] = None
    documentation_health: str
    urgency_level: str
    risk_impact: str
    recommended_handoff: str

# --- Living Runbooks Schemas ---
class LivingRunbookResponse(BaseModel):
    id: str
    project_id: str
    title: str
    category: str
    description: Optional[str] = None
    content_markdown: str
    prerequisites: List[str]
    commands: List[str]
    is_verified: bool
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None

class LivingRunbookCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    content_markdown: str
    prerequisites: List[str] = []
    commands: List[str] = []

class LivingRunbookVerify(BaseModel):
    is_verified: bool

# --- Successor Missions Schemas ---
class SuccessorMissionResponse(BaseModel):
    id: str
    project_id: str
    mission_number: int
    title: str
    objective: str
    estimated_minutes: int
    instructions_markdown: str
    completion_criteria: List[str]
    status: str
    successor_notes: Optional[str] = None
    completed_at: Optional[datetime] = None

class SuccessorMissionUpdate(BaseModel):
    status: Optional[str] = None
    successor_notes: Optional[str] = None

# --- Collaboration Schemas ---
class CollaborationCommentResponse(BaseModel):
    id: str
    project_id: str
    claim_id: Optional[str] = None
    runbook_id: Optional[str] = None
    author_name: str
    author_role: str
    comment_text: str
    status_tag: str
    created_at: datetime

class CollaborationCommentCreate(BaseModel):
    claim_id: Optional[str] = None
    runbook_id: Optional[str] = None
    comment_text: str
    status_tag: Optional[str] = "general"

# --- Knowledge Graph Schemas ---
class GraphNode(BaseModel):
    id: str
    label: str
    type: str # person, decision, task, file, repo, dependency, risk, system, contact
    details: Optional[str] = None
    status: Optional[str] = None
    critical: Optional[bool] = False
    evidence_quote: Optional[str] = None
    evidence_location: Optional[str] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str # OWNS, DEPENDS_ON, DECIDED, BLOCKED_BY, DOCUMENTED_IN, CONTRIBUTED_TO, REQUIRES_ACCESS_TO
    label: str

class KnowledgeGraphResponse(BaseModel):
    project_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: Dict[str, int]

# --- Ask Your Project RAG Schemas ---
class AssistantCitation(BaseModel):
    source_id: str
    source_name: str
    chunk_id: Optional[str] = None
    location: str
    exact_quote: str
    confidence: float

class AssistantAskRequest(BaseModel):
    question: str
    session_id: Optional[str] = None

class AssistantAskResponse(BaseModel):
    question: str
    answer: str
    confidence: float # 0.0 to 1.0
    grounding_status: str # grounded, partially_grounded, ungrounded_refusal
    citations: List[AssistantCitation]
    missing_evidence_note: Optional[str] = None
    follow_up_suggestions: List[str]

# --- Drift Detection Schemas ---
class DriftItem(BaseModel):
    id: str
    drift_type: str # changed_decision, outdated_instruction, changed_owner, new_blocker, deprecated_dependency
    title: str
    baseline_value: str
    current_value: str
    severity: str
    detected_source: str
    impact: str
    recommended_action: str

class DriftResponse(BaseModel):
    project_id: str
    drift_score: float # 0-100 indicating project stability
    total_drifts: int
    items: List[DriftItem]

# --- Security Simulator Schemas ---
class SecurityTestCase(BaseModel):
    test_id: str
    attack_type: str # direct_retrieval, paraphrase_query, rag_injection, cross_project
    canary_id: str
    target_role: str
    prompt_payload: str
    canary_token_expected: bool
    canary_token_leaked: bool
    passed: bool
    status_explanation: str

class SecuritySimulationResponse(BaseModel):
    total_tests: int
    passed_tests: int
    failed_tests: int
    leak_rate_percentage: float
    shield_status: str # SECURE / COMPLIANT / LEAK_DETECTED
    results: List[SecurityTestCase]
