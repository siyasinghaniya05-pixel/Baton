from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.continuity import LivingRunbook
from app.schemas.continuity import (
    LivingRunbookResponse, LivingRunbookCreate, LivingRunbookVerify
)

router = APIRouter(tags=["Living Runbooks"])

@router.get("/projects/{project_id}/runbooks", response_model=List[LivingRunbookResponse])
def get_runbooks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    runbooks = db.query(LivingRunbook).filter(
        LivingRunbook.project_id == project_id
    ).order_by(LivingRunbook.created_at.asc()).all()
    return runbooks

@router.post("/projects/{project_id}/runbooks", response_model=LivingRunbookResponse, status_code=status.HTTP_201_CREATED)
def create_runbook(
    project_id: str,
    payload: LivingRunbookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    runbook = LivingRunbook(
        project_id=project_id,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        content_markdown=payload.content_markdown,
        prerequisites=payload.prerequisites,
        commands=payload.commands,
        is_verified=False
    )
    db.add(runbook)
    db.commit()
    db.refresh(runbook)
    return runbook

@router.post("/projects/{project_id}/runbooks/{runbook_id}/verify", response_model=LivingRunbookResponse)
def verify_runbook(
    project_id: str,
    runbook_id: str,
    payload: LivingRunbookVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    runbook = db.query(LivingRunbook).filter(
        LivingRunbook.id == runbook_id,
        LivingRunbook.project_id == project_id
    ).first()
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")

    runbook.is_verified = payload.is_verified
    if payload.is_verified:
        runbook.verified_by = f"{current_user.full_name} ({current_user.role.value})"
        runbook.verified_at = datetime.utcnow()
    else:
        runbook.verified_by = None
        runbook.verified_at = None

    db.commit()
    db.refresh(runbook)
    return runbook

