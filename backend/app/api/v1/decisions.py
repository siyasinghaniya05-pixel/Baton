from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.continuity import DecisionRecord
from app.schemas.continuity import DecisionRecordResponse, DecisionCreate

router = APIRouter(tags=["Decision Archaeology"])

@router.get("/projects/{project_id}/decisions", response_model=List[DecisionRecordResponse])
def get_decisions(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decisions = db.query(DecisionRecord).filter(
        DecisionRecord.project_id == project_id
    ).order_by(DecisionRecord.created_at.desc()).all()
    return decisions

@router.post("/projects/{project_id}/decisions", response_model=DecisionRecordResponse, status_code=status.HTTP_201_CREATED)
def create_decision(
    project_id: str,
    payload: DecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dec = DecisionRecord(
        project_id=project_id,
        title=payload.title,
        what_decided=payload.what_decided,
        participants=payload.participants,
        decided_date=payload.decided_date,
        why_selected=payload.why_selected,
        alternatives_considered=payload.alternatives_considered,
        concerns_raised=payload.concerns_raised,
        evidence_quote=payload.evidence_quote,
        evidence_location=payload.evidence_location,
        reversal_status=payload.reversal_status or "active",
        reasoning_missing=payload.reasoning_missing or False
    )
    db.add(dec)
    db.commit()
    db.refresh(dec)
    return dec

@router.get("/projects/{project_id}/decisions/{decision_id}", response_model=DecisionRecordResponse)
def get_decision_detail(
    project_id: str,
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dec = db.query(DecisionRecord).filter(
        DecisionRecord.id == decision_id,
        DecisionRecord.project_id == project_id
    ).first()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision record not found")
    return dec

