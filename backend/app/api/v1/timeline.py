from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.claim import Claim, ClaimCategory, ClaimStatus
from app.core.security import get_current_user
from app.core.permissions import can_access_sensitivity

router = APIRouter(prefix="/timeline", tags=["Timeline"])

@router.get("/project/{project_id}")
def get_project_timeline(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    
    events = []
    for c in claims:
        if not can_access_sensitivity(current_user.role, c.sensitivity):
            continue

        # Map event type & color coding
        event_type = "decision"
        if c.status == ClaimStatus.CONFLICT:
            event_type = "conflict"
        elif c.category == ClaimCategory.BLOCKER:
            event_type = "blocker"
        elif c.category == ClaimCategory.TIMELINE_MILESTONE:
            event_type = "milestone"
        elif c.category == ClaimCategory.PENDING_TASK:
            event_type = "task"
        elif c.category == ClaimCategory.RISK:
            event_type = "risk"

        events.append({
            "id": c.id,
            "title": c.description,
            "category": c.category.value,
            "event_type": event_type,
            "status": c.status.value,
            "confidence": c.confidence,
            "exact_quote": c.exact_quote,
            "evidence_location": c.evidence_location,
            "date": c.event_timestamp.strftime("%Y-%m-%d") if c.event_timestamp else c.created_at.strftime("%Y-%m-%d"),
            "timestamp": c.created_at.isoformat(),
            "reasoning": c.reasoning
        })

    # Sort chronologically
    events.sort(key=lambda x: x["timestamp"])
    return events

