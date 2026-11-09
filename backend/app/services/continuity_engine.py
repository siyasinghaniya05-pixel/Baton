from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimStatus, ReviewState, ClaimCategory
from app.models.continuity import (
    RiskFinding, RiskSeverity, RiskCategory, BusFactorItem, 
    LivingRunbook, DecisionRecord
)
from app.models.gap_interview import GapQuestion, GapStatus
from app.schemas.continuity import (
    ReadinessResponse, CategoryScore, DeductionDetail,
    RiskRadarSummary, RiskFindingResponse, BusFactorItemResponse
)

def compute_handover_readiness(db: Session, project_id: str) -> ReadinessResponse:
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    gaps = db.query(GapQuestion).filter(GapQuestion.project_id == project_id).all()
    runbooks = db.query(LivingRunbook).filter(LivingRunbook.project_id == project_id).all()
    bus_items = db.query(BusFactorItem).filter(BusFactorItem.project_id == project_id).all()
    risks = db.query(RiskFinding).filter(RiskFinding.project_id == project_id).all()

    total_claims = len(claims)
    if total_claims == 0:
        total_claims = 1 # Avoid div by zero

    # Count claim statuses
    verified_count = sum(1 for c in claims if c.status in [ClaimStatus.VERIFIED, ClaimStatus.EVIDENCE_BACKED])
    conflict_count = sum(1 for c in claims if c.status == ClaimStatus.CONFLICT)
    missing_count = sum(1 for c in claims if c.status == ClaimStatus.MISSING)
    reviewed_count = sum(1 for c in claims if c.review_state in [ReviewState.ACCEPTED, ReviewState.EDITED])
    
    # 1. Evidence Coverage (25% weight)
    evidence_ratio = verified_count / total_claims
    evidence_score = round(evidence_ratio * 25.0, 1)

    # 2. Ownership Clarity (20% weight)
    tasks = [c for c in claims if c.category in [ClaimCategory.TASK_OWNERSHIP, ClaimCategory.PENDING_TASK]]
    # Tasks with named owner in description or metadata
    tasks_with_owner = sum(1 for t in tasks if any(name in t.description for name in ["Alex", "Elena", "Marcus", "Sam", "Priya"]))
    task_owner_ratio = (tasks_with_owner / len(tasks)) if tasks else 0.85
    single_person_high_risk = sum(1 for b in bus_items if b.urgency_level in ["critical", "high"] and not b.backup_owner)
    ownership_penalty = min(0.4, single_person_high_risk * 0.1)
    ownership_score = round(max(0.0, (task_owner_ratio - ownership_penalty) * 20.0), 1)

    # 3. Conflict Resolution (15% weight)
    # Penalty for unresolved conflicts
    conflict_deduction = conflict_count * 5.0
    conflict_score = round(max(0.0, 15.0 - conflict_deduction), 1)

    # 4. Dependency Documentation (15% weight)
    dep_claims = [c for c in claims if c.category in [ClaimCategory.DEPENDENCY, ClaimCategory.BLOCKER]]
    dep_verified = sum(1 for d in dep_claims if d.status in [ClaimStatus.VERIFIED, ClaimStatus.EVIDENCE_BACKED])
    dep_ratio = (dep_verified / len(dep_claims)) if dep_claims else 0.9
    dep_score = round(dep_ratio * 15.0, 1)

    # 5. Access and Deployment Readiness (15% weight)
    verified_runbooks = sum(1 for r in runbooks if r.is_verified)
    runbook_ratio = (verified_runbooks / len(runbooks)) if runbooks else 0.5
    access_score = round(runbook_ratio * 15.0, 1)

    # 6. Human Review Completion (10% weight)
    review_ratio = reviewed_count / total_claims
    review_score = round(review_ratio * 10.0, 1)

    # Deductions and Actionable Findings
    deductions: List[DeductionDetail] = []
    actions: List[str] = []

    if conflict_count > 0:
        deductions.append(DeductionDetail(
            category="Conflict Resolution",
            points_deducted=round(15.0 - conflict_score, 1),
            reason=f"{conflict_count} contradictory claims remain active without reconciliation.",
            remediation_action="Reviewer or Leaver must reconcile conflicting claims in Review Workspace."
        ))
        actions.append(f"Reconcile {conflict_count} conflicting claims (e.g., Redis vs Kafka message queue contradiction).")

    if missing_count > 0:
        deductions.append(DeductionDetail(
            category="Evidence Coverage",
            points_deducted=round(25.0 - evidence_score, 1),
            reason=f"{missing_count} essential knowledge claims are marked as MISSING gaps.",
            remediation_action="Answer the pending Gap Interview questions to backfill missing evidence."
        ))
        actions.append(f"Complete {missing_count} open gap interview questions to verify missing claims.")

    if single_person_high_risk > 0:
        deductions.append(DeductionDetail(
            category="Ownership Clarity",
            points_deducted=round(single_person_high_risk * 2.5, 1),
            reason=f"{single_person_high_risk} key system areas have a bus factor of 1 with no named successor/backup.",
            remediation_action="Assign a designated secondary owner in Bus-Factor Intelligence."
        ))
        actions.append("Designate backup owners for high-urgency single-person components.")

    unverified_runbooks = len(runbooks) - verified_runbooks
    if unverified_runbooks > 0:
        deductions.append(DeductionDetail(
            category="Access & Deployment",
            points_deducted=round(15.0 - access_score, 1),
            reason=f"{unverified_runbooks} operational living runbooks have not yet been peer-tested or verified.",
            remediation_action="Perform test runs of setup and deployment runbooks and mark verified."
        ))
        actions.append(f"Verify and test {unverified_runbooks} pending runbooks (e.g. Disaster Recovery Runbook).")

    unreviewed_count = total_claims - reviewed_count
    if unreviewed_count > 0:
        deductions.append(DeductionDetail(
            category="Human Review",
            points_deducted=round(10.0 - review_score, 1),
            reason=f"{unreviewed_count} claims await formal sign-off in the Review Workspace.",
            remediation_action="Approve or amend pending claims to reach 100% human sign-off."
        ))
        actions.append(f"Approve {unreviewed_count} pending claims in Review Workspace.")

    overall_score = round(evidence_score + ownership_score + conflict_score + dep_score + access_score + review_score, 1)
    
    # Grade determination
    critical_blockers = sum(1 for r in risks if r.severity == RiskSeverity.CRITICAL and r.resolution_status == "open")
    if critical_blockers > 0 or conflict_count > 0:
        readiness_grade = "Blocked" if critical_blockers > 0 else "At Risk"
        is_deployable = False
    elif overall_score >= 85:
        readiness_grade = "Ready"
        is_deployable = True
    elif overall_score >= 70:
        readiness_grade = "High Confidence"
        is_deployable = True
    else:
        readiness_grade = "At Risk"
        is_deployable = False

    categories = [
        CategoryScore(
            category="Evidence Coverage",
            weight=25.0,
            score=evidence_score,
            max_score=25.0,
            status="optimal" if evidence_score >= 21 else "needs_attention",
            rationale=f"{verified_count}/{total_claims} claims backed by direct source quotes."
        ),
        CategoryScore(
            category="Ownership Clarity",
            weight=20.0,
            score=ownership_score,
            max_score=20.0,
            status="optimal" if ownership_score >= 16 else "warning",
            rationale=f"{tasks_with_owner}/{len(tasks) if tasks else 0} tasks have assigned owners with active bus mitigation."
        ),
        CategoryScore(
            category="Conflict Resolution",
            weight=15.0,
            score=conflict_score,
            max_score=15.0,
            status="optimal" if conflict_count == 0 else "critical",
            rationale=f"{conflict_count} contradictory claims detected across sources."
        ),
        CategoryScore(
            category="Dependency Documentation",
            weight=15.0,
            score=dep_score,
            max_score=15.0,
            status="optimal" if dep_score >= 12 else "needs_attention",
            rationale="Architecture, APIs, and external systems mapped with explicit dependencies."
        ),
        CategoryScore(
            category="Access & Deployment Readiness",
            weight=15.0,
            score=access_score,
            max_score=15.0,
            status="optimal" if access_score >= 12 else "warning",
            rationale=f"{verified_runbooks}/{len(runbooks)} living runbooks verified and runnable."
        ),
        CategoryScore(
            category="Human Review Completion",
            weight=10.0,
            score=review_score,
            max_score=10.0,
            status="optimal" if review_score >= 8 else "needs_attention",
            rationale=f"{reviewed_count}/{total_claims} claims accepted by human reviewer."
        )
    ]

    return ReadinessResponse(
        project_id=project_id,
        overall_score=overall_score,
        readiness_grade=readiness_grade,
        is_deployable=is_deployable,
        critical_blockers_count=critical_blockers,
        unresolved_conflicts_count=conflict_count,
        missing_gaps_count=missing_count,
        categories=categories,
        deductions=deductions,
        recommended_actions=actions
    )

def get_risk_radar_summary(db: Session, project_id: str) -> RiskRadarSummary:
    risks = db.query(RiskFinding).filter(RiskFinding.project_id == project_id).all()
    
    total = len(risks)
    crit = sum(1 for r in risks if r.severity == RiskSeverity.CRITICAL)
    high = sum(1 for r in risks if r.severity == RiskSeverity.HIGH)
    med = sum(1 for r in risks if r.severity == RiskSeverity.MEDIUM)
    low = sum(1 for r in risks if r.severity == RiskSeverity.LOW)

    by_cat: Dict[str, int] = {}
    for r in risks:
        by_cat[r.category] = by_cat.get(r.category, 0) + 1

    findings = [
        RiskFindingResponse(
            id=r.id,
            project_id=r.project_id,
            category=r.category,
            title=r.title,
            severity=r.severity,
            description=r.description,
            affected_entity=r.affected_entity,
            mitigation=r.mitigation,
            resolution_status=r.resolution_status,
            evidence_reference=r.evidence_reference,
            claim_id=r.claim_id,
            created_at=r.created_at
        ) for r in risks
    ]

    return RiskRadarSummary(
        total_risks=total,
        critical_count=crit,
        high_count=high,
        medium_count=med,
        low_count=low,
        by_category=by_cat,
        findings=findings
    )
