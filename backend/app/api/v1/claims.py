import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.claim import Claim, EvidenceSpan, ClaimStatus, ClaimCategory, ReviewState
from app.models.project import SensitivityLevel
from app.models.audit import AuditLog
from app.schemas.claim import ClaimOut, ClaimCreate, ClaimUpdate, EvidenceSpanOut
from app.core.security import get_current_user
from app.core.permissions import can_access_sensitivity

router = APIRouter(prefix="/claims", tags=["Claims"])

@router.get("/project/{project_id}", response_model=List[ClaimOut])
def list_project_claims(
    project_id: str,
    status: Optional[ClaimStatus] = Query(None),
    category: Optional[ClaimCategory] = Query(None),
    review_state: Optional[ReviewState] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Claim).filter(Claim.project_id == project_id)
    
    if status:
        query = query.filter(Claim.status == status)
    if category:
        query = query.filter(Claim.category == category)
    if review_state:
        query = query.filter(Claim.review_state == review_state)
    if search:
        query = query.filter(Claim.description.ilike(f"%{search}%"))

    claims = query.order_by(Claim.created_at.asc()).all()

    # Enforce permission filtering at API level
    results = []
    for c in claims:
        # Check sensitivity access
        if not can_access_sensitivity(current_user.role, c.sensitivity):
            # Mask or skip for unauthorized users
            if current_user.role == UserRole.RESTRICTED_VIEWER:
                continue
        
        spans = db.query(EvidenceSpan).filter(EvidenceSpan.claim_id == c.id).all()
        span_outs = [
            EvidenceSpanOut(
                id=s.id,
                chunk_id=s.chunk_id,
                quote=s.quote,
                char_start=s.char_start,
                char_end=s.char_end,
                verified_deterministic=s.verified_deterministic,
                semantic_support_score=s.semantic_support_score
            )
            for s in spans
        ]

        c_out = ClaimOut(
            id=c.id,
            project_id=c.project_id,
            category=c.category,
            description=c.description,
            reasoning=c.reasoning,
            exact_quote=c.exact_quote,
            source_id=c.source_id,
            chunk_id=c.chunk_id,
            evidence_location=c.evidence_location,
            confidence=c.confidence,
            status=c.status,
            sensitivity=c.sensitivity,
            review_state=c.review_state,
            reviewer_notes=c.reviewer_notes,
            conflict_claim_id=c.conflict_claim_id,
            event_timestamp=c.event_timestamp,
            created_at=c.created_at,
            updated_at=c.updated_at,
            evidence_spans=span_outs
        )
        results.append(c_out)

    return results

@router.get("/{claim_id}", response_model=ClaimOut)
def get_claim(claim_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Claim).filter(Claim.id == claim_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Claim not found")

    if not can_access_sensitivity(current_user.role, c.sensitivity):
        raise HTTPException(status_code=403, detail="Clearance level insufficient to access this claim")

    spans = db.query(EvidenceSpan).filter(EvidenceSpan.claim_id == c.id).all()
    span_outs = [
        EvidenceSpanOut(
            id=s.id,
            chunk_id=s.chunk_id,
            quote=s.quote,
            char_start=s.char_start,
            char_end=s.char_end,
            verified_deterministic=s.verified_deterministic,
            semantic_support_score=s.semantic_support_score
        )
        for s in spans
    ]

    return ClaimOut(
        id=c.id,
        project_id=c.project_id,
        category=c.category,
        description=c.description,
        reasoning=c.reasoning,
        exact_quote=c.exact_quote,
        source_id=c.source_id,
        chunk_id=c.chunk_id,
        evidence_location=c.evidence_location,
        confidence=c.confidence,
        status=c.status,
        sensitivity=c.sensitivity,
        review_state=c.review_state,
        reviewer_notes=c.reviewer_notes,
        conflict_claim_id=c.conflict_claim_id,
        event_timestamp=c.event_timestamp,
        created_at=c.created_at,
        updated_at=c.updated_at,
        evidence_spans=span_outs
    )

