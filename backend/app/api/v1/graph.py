from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.continuity import KnowledgeGraphResponse
from app.services.knowledge_graph_engine import generate_knowledge_graph

router = APIRouter(tags=["Knowledge Graph"])

@router.get("/projects/{project_id}/graph", response_model=KnowledgeGraphResponse)
def get_graph(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return generate_knowledge_graph(db, project_id)
