import uuid
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.handover import (
    HandoverVersion, HandoverView, ContinuationAction, 
    Acknowledgement, ComprehensionCheck, HandoverStatus
)
from app.models.audit import AuditLog
from app.schemas.handover import (
    HandoverVersionOut, HandoverVersionCreate, HandoverViewOut,
    ContinuationActionOut, ComprehensionCheckOut, AcknowledgementCreate, AcknowledgementOut
)
from app.core.security import get_current_user
from app.services.handover_generator import HandoverGenerator

router = APIRouter(prefix="/handovers", tags=["Handovers"])

@router.get("/project/{project_id}", response_model=List[HandoverVersionOut])
def list_project_handovers(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    handovers = db.query(HandoverVersion).filter(HandoverVersion.project_id == project_id).order_by(HandoverVersion.version_number.desc()).all()
    results = []
    for h in handovers:
        views = db.query(HandoverView).filter(HandoverView.handover_version_id == h.id).all()
        actions = db.query(ContinuationAction).filter(ContinuationAction.handover_version_id == h.id).all()
        checks = db.query(ComprehensionCheck).filter(ComprehensionCheck.handover_version_id == h.id).all()

        h_out = HandoverVersionOut(
            id=h.id,
            project_id=h.project_id,
            version_number=h.version_number,
            title=h.title,
            executive_summary=h.executive_summary,
            status=h.status,
            approved_by=h.approved_by,
            approved_at=h.approved_at,
            published_share_token=h.published_share_token,
            share_expires_at=h.share_expires_at,
            created_at=h.created_at,
            views=[HandoverViewOut.from_orm(v) for v in views],
            actions=[ContinuationActionOut.from_orm(a) for a in actions],
            comprehension_checks=[ComprehensionCheckOut.from_orm(c) for c in checks]
        )
        results.append(h_out)
    return results

@router.get("/{handover_id}", response_model=HandoverVersionOut)
def get_handover(handover_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    h = db.query(HandoverVersion).filter(HandoverVersion.id == handover_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")

    views = db.query(HandoverView).filter(HandoverView.handover_version_id == h.id).all()
    actions = db.query(ContinuationAction).filter(ContinuationAction.handover_version_id == h.id).all()
    checks = db.query(ComprehensionCheck).filter(ComprehensionCheck.handover_version_id == h.id).all()

    return HandoverVersionOut(
        id=h.id,
        project_id=h.project_id,
        version_number=h.version_number,
        title=h.title,
        executive_summary=h.executive_summary,
        status=h.status,
        approved_by=h.approved_by,
        approved_at=h.approved_at,
        published_share_token=h.published_share_token,
        share_expires_at=h.share_expires_at,
        created_at=h.created_at,
        views=[HandoverViewOut.from_orm(v) for v in views],
        actions=[ContinuationActionOut.from_orm(a) for a in actions],
        comprehension_checks=[ComprehensionCheckOut.from_orm(c) for c in checks]
    )

@router.get("/{handover_id}/role-view")
def get_role_handover_view(
    handover_id: str,
    target_role: Optional[UserRole] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce caller's role if target_role is more privileged than caller
    effective_role = target_role if target_role and current_user.role in [UserRole.ADMIN, UserRole.REVIEWER] else current_user.role

    view = db.query(HandoverView).filter(
        HandoverView.handover_version_id == handover_id,
        HandoverView.target_role == effective_role
    ).first()

    if not view:
        # Fallback to successor view
        view = db.query(HandoverView).filter(
            HandoverView.handover_version_id == handover_id,
            HandoverView.target_role == UserRole.SUCCESSOR
        ).first()

    if not view:
        raise HTTPException(status_code=404, detail="Handover view not compiled for this role")

    return {
        "view_id": view.id,
        "target_role": view.target_role.value,
        "sensitive_items_count": view.sensitive_items_count,
        "redacted_placeholders_count": view.redacted_placeholders_count,
        "content": view.compiled_content
    }

@router.post("/compile", response_model=HandoverVersionOut)
def compile_new_handover(
    project_id: str,
    title: str = "New Handover Version",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.LEAVER]:
        raise HTTPException(status_code=403, detail="Not authorized to compile handovers")

    handover = HandoverGenerator.compile_handover_version(
        db=db,
        project_id=project_id,
        title=title,
        user_id=current_user.id
    )
    
    views = db.query(HandoverView).filter(HandoverView.handover_version_id == handover.id).all()
    actions = db.query(ContinuationAction).filter(ContinuationAction.handover_version_id == handover.id).all()
    checks = db.query(ComprehensionCheck).filter(ComprehensionCheck.handover_version_id == handover.id).all()

    return HandoverVersionOut(
        id=handover.id,
        project_id=handover.project_id,
        version_number=handover.version_number,
        title=handover.title,
        executive_summary=handover.executive_summary,
        status=handover.status,
        approved_by=handover.approved_by,
        approved_at=handover.approved_at,
        published_share_token=handover.published_share_token,
        share_expires_at=handover.share_expires_at,
        created_at=handover.created_at,
        views=[HandoverViewOut.from_orm(v) for v in views],
        actions=[ContinuationActionOut.from_orm(a) for a in actions],
        comprehension_checks=[ComprehensionCheckOut.from_orm(c) for c in checks]
    )

@router.post("/{handover_id}/publish")
def publish_handover(
    handover_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only approved handovers can be published
    handover = db.query(HandoverVersion).filter(HandoverVersion.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")
        
    if handover.status != HandoverStatus.APPROVED and current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=400, detail="Handover must be explicitly approved before publishing")

    handover.status = HandoverStatus.PUBLISHED
    if not handover.published_share_token:
        handover.published_share_token = hashlib.sha256(f"{handover.id}-{datetime.utcnow().isoformat()}".encode()).hexdigest()[:32]
    handover.share_expires_at = datetime.utcnow() + timedelta(days=14)

    # Log to audit trail
    al = AuditLog(
        id=str(uuid.uuid4()),
        project_id=handover.project_id,
        user_id=current_user.id,
        action="handover_published",
        target_type="handover_version",
        target_id=handover.id,
        details={"share_token": handover.published_share_token, "expires_at": handover.share_expires_at.isoformat()}
    )
    db.add(al)
    db.commit()

    return {
        "status": "published",
        "handover_id": handover.id,
        "share_token": handover.published_share_token,
        "share_expires_at": handover.share_expires_at
    }

@router.post("/{handover_id}/acknowledge", response_model=AcknowledgementOut)
def acknowledge_handover_receipt(
    handover_id: str,
    ack_in: AcknowledgementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    handover = db.query(HandoverVersion).filter(HandoverVersion.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")

    # Evaluate comprehension quiz answers
    checks = db.query(ComprehensionCheck).filter(ComprehensionCheck.handover_version_id == handover.id).all()
    correct_count = 0
    total_checks = len(checks)

    for idx, check in enumerate(checks):
        if idx < len(ack_in.quiz_answers):
            if ack_in.quiz_answers[idx] == check.correct_option_index:
                correct_count += 1

    score_pct = int((correct_count / total_checks * 100)) if total_checks > 0 else 100
    passed = score_pct >= 66

    receipt_raw = f"{handover.id}:{current_user.id}:{datetime.utcnow().isoformat()}:{score_pct}"
    receipt_hash = hashlib.sha256(receipt_raw.encode()).hexdigest()

    ack = Acknowledgement(
        id=str(uuid.uuid4()),
        handover_version_id=handover.id,
        successor_id=current_user.id,
        quiz_passed=passed,
        quiz_score=score_pct,
        receipt_hash=receipt_hash,
        successor_comments=ack_in.successor_comments
    )
    db.add(ack)

    # Log acknowledgement
    al = AuditLog(
        id=str(uuid.uuid4()),
        project_id=handover.project_id,
        user_id=current_user.id,
        action="handover_acknowledged_receipt",
        target_type="acknowledgement",
        target_id=ack.id,
        details={
            "successor_name": current_user.full_name,
            "quiz_score": score_pct,
            "receipt_hash": receipt_hash
        }
    )
    db.add(al)
    db.commit()
    db.refresh(ack)

    return ack

