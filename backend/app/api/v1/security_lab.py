from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.continuity import SecuritySimulationResponse
from app.services.security_simulator import run_security_simulation

router = APIRouter(tags=["Security & Privacy Lab"])

@router.post("/projects/{project_id}/security-lab/simulate", response_model=SecuritySimulationResponse)
def simulate_leak_tests(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return run_security_simulation(db, project_id)

