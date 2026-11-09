from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project, SensitivityLevel
from app.models.source import Source
from app.models.claim import Claim, ClaimStatus, ClaimCategory, ReviewState
from app.models.handover import HandoverVersion, HandoverStatus
from app.models.audit import AuditLog
from app.schemas.project import AnalyticsOut
from app.core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=AnalyticsOut)
def get_dashboard_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_projects = db.query(Project).count()
    total_sources = db.query(Source).count()
    active_handovers = db.query(HandoverVersion).filter(HandoverVersion.status.in_([HandoverStatus.DRAFT, HandoverStatus.UNDER_REVIEW])).count()
    approved_handovers = db.query(HandoverVersion).filter(HandoverVersion.status.in_([HandoverStatus.APPROVED, HandoverStatus.PUBLISHED])).count()
    pending_reviews = db.query(Claim).filter(Claim.review_state == ReviewState.PENDING).count()
    
    missing_info = db.query(Claim).filter(Claim.status == ClaimStatus.MISSING).count()
    conflicts = db.query(Claim).filter(Claim.status == ClaimStatus.CONFLICT).count()
    verified = db.query(Claim).filter(Claim.status == ClaimStatus.VERIFIED).count()
    evidence_backed = db.query(Claim).filter(Claim.status == ClaimStatus.EVIDENCE_BACKED).count()
    inferred = db.query(Claim).filter(Claim.status == ClaimStatus.INFERRED).count()

    # Category distribution
    categories = db.query(Claim.category).all()
    cat_dist = {}
    for (cat,) in categories:
        val = cat.value if hasattr(cat, "value") else str(cat)
        cat_dist[val] = cat_dist.get(val, 0) + 1

    # Sensitivity distribution
    sensitivities = db.query(Claim.sensitivity).all()
    sens_dist = {}
    for (s,) in sensitivities:
        val = s.value if hasattr(s, "value") else str(s)
        sens_dist[val] = sens_dist.get(val, 0) + 1

    # Recent activity
    recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    activity = []
    for log in recent_logs:
        u = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        activity.append({
            "id": log.id,
            "action": log.action,
            "target": log.target_type,
            "user": u.full_name if u else "System",
            "time": log.created_at.strftime("%b %d, %H:%M"),
            "details": log.details or {}
        })

    return AnalyticsOut(
        total_projects=total_projects,
        active_handovers=active_handovers,
        pending_reviews=pending_reviews,
        approved_handovers=approved_handovers,
        missing_information=missing_info,
        conflicting_claims=conflicts,
        verified_claims=verified,
        evidence_backed_claims=evidence_backed,
        inferred_claims=inferred,
        total_sources=total_sources,
        category_distribution=cat_dist,
        sensitivity_distribution=sens_dist,
        recent_activity=activity
    )

