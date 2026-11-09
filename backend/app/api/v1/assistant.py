from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.continuity import AssistantAskRequest, AssistantAskResponse
from app.services.assistant_rag import query_assistant

router = APIRouter(tags=["AI Project Assistant"])

@router.post("/projects/{project_id}/assistant/ask", response_model=AssistantAskResponse)
def ask_assistant(
    project_id: str,
    payload: AssistantAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return query_assistant(
        db=db,
        project_id=project_id,
        user_role=current_user.role,
        question=payload.question
    )

