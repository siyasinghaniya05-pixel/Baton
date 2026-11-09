from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.continuity import SuccessorMission
from app.schemas.continuity import SuccessorMissionResponse, SuccessorMissionUpdate

router = APIRouter(tags=["Successor Missions"])

@router.get("/projects/{project_id}/missions", response_model=List[SuccessorMissionResponse])
def get_missions(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    missions = db.query(SuccessorMission).filter(
        SuccessorMission.project_id == project_id
    ).order_by(SuccessorMission.mission_number.asc()).all()
    return missions

@router.patch("/projects/{project_id}/missions/{mission_id}", response_model=SuccessorMissionResponse)
def update_mission(
    project_id: str,
    mission_id: str,
    payload: SuccessorMissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(SuccessorMission).filter(
        SuccessorMission.id == mission_id,
        SuccessorMission.project_id == project_id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if payload.status:
        mission.status = payload.status
        if payload.status == "completed":
            mission.completed_at = datetime.utcnow()
        elif payload.status != "completed":
            mission.completed_at = None

    if payload.successor_notes is not None:
        mission.successor_notes = payload.successor_notes

    db.commit()
    db.refresh(mission)
    return mission
