from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.continuity import CollaborationComment
from app.schemas.continuity import CollaborationCommentResponse, CollaborationCommentCreate

router = APIRouter(tags=["Collaboration Room"])

@router.get("/projects/{project_id}/collaboration/comments", response_model=List[CollaborationCommentResponse])
def get_comments(
    project_id: str,
    claim_id: Optional[str] = None,
    runbook_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CollaborationComment).filter(CollaborationComment.project_id == project_id)
    if claim_id:
        query = query.filter(CollaborationComment.claim_id == claim_id)
    if runbook_id:
        query = query.filter(CollaborationComment.runbook_id == runbook_id)
    return query.order_by(CollaborationComment.created_at.asc()).all()

@router.post("/projects/{project_id}/collaboration/comments", response_model=CollaborationCommentResponse, status_code=status.HTTP_201_CREATED)
def post_comment(
    project_id: str,
    payload: CollaborationCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = CollaborationComment(
        project_id=project_id,
        claim_id=payload.claim_id,
        runbook_id=payload.runbook_id,
        author_name=current_user.full_name,
        author_role=current_user.role.value,
        comment_text=payload.comment_text,
        status_tag=payload.status_tag or "general"
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
