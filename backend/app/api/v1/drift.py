from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.continuity import DriftResponse
from app.services.drift_detector import detect_knowledge_drift

router = APIRouter(tags=["Knowledge Drift"])

@router.get("/projects/{project_id}/drift", response_model=DriftResponse)
def get_drift(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return detect_knowledge_drift(db, project_id)
