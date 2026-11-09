import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.claim import Claim, ReviewState, ClaimStatus
from app.models.handover import HandoverVersion, HandoverStatus
from app.models.audit import AuditLog
from app.schemas.claim import ClaimReviewAction, ClaimOut
from app.core.security import get_current_user
from app.core.permissions import require_roles

router = APIRouter(prefix="/review", tags=["Review Workspace"])

@router.post("/claim/{claim_id}", response_model=ClaimOut)
def review_claim(
    claim_id: str,
    review_in: ClaimReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Reviewer and Admin can review claims
    if current_user.role not in [UserRole.REVIEWER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only Reviewers and Admins can approve or modify claims")

    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    prev_state = claim.review_state.value
    prev_desc = claim.description

    if review_in.action == ReviewState.ACCEPTED:
        claim.review_state = ReviewState.ACCEPTED
        if claim.status in [ClaimStatus.EVIDENCE_BACKED, ClaimStatus.INFERRED]:
            claim.status = ClaimStatus.VERIFIED
    elif review_in.action == ReviewState.EDITED:
        claim.review_state = ReviewState.EDITED
        if review_in.edited_description:
            claim.description = review_in.edited_description
    elif review_in.action == ReviewState.REJECTED:
        claim.review_state = ReviewState.REJECTED

    if review_in.reviewer_notes:
        claim.reviewer_notes = review_in.reviewer_notes

    # Append-only audit record
    audit_entry = AuditLog(
        id=str(uuid.uuid4()),
        project_id=claim.project_id,
        user_id=current_user.id,
        action=f"claim_{review_in.action.value}",
        target_type="claim",
        target_id=claim.id,
        details={
            "previous_state": prev_state,
            "new_state": review_in.action.value,
            "previous_description": prev_desc,
            "new_description": claim.description,
            "reviewer_notes": review_in.reviewer_notes,
            "reviewer_name": current_user.full_name
        }
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(claim)

    return ClaimOut.from_orm(claim)

@router.post("/handover/{handover_id}/approve")
def approve_handover(
    handover_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Strict rule: "No handover can be published without explicit human approval."
    if current_user.role not in [UserRole.REVIEWER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only Reviewers and Admins can approve a handover")

    handover = db.query(HandoverVersion).filter(HandoverVersion.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=404, detail="Handover version not found")

    handover.status = HandoverStatus.APPROVED
    handover.approved_by = current_user.id
    from datetime import datetime
    handover.approved_at = datetime.utcnow()

    # Log to audit trail
    al = AuditLog(
        id=str(uuid.uuid4()),
        project_id=handover.project_id,
        user_id=current_user.id,
        action="handover_version_approved",
        target_type="handover_version",
        target_id=handover.id,
        details={
            "version_number": handover.version_number,
            "title": handover.title,
            "approved_by": current_user.full_name
        }
    )
    db.add(al)
    db.commit()

    return {
        "status": "approved",
        "handover_id": handover.id,
        "version_number": handover.version_number,
        "approved_by": current_user.full_name,
        "approved_at": handover.approved_at
    }

