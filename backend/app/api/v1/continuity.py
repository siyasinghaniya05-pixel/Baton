from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.continuity import RiskFinding, BusFactorItem
from app.schemas.continuity import (
    ReadinessResponse, RiskRadarSummary, RiskFindingResponse,
    RiskFindingCreate, BusFactorItemResponse
)
from app.services.continuity_engine import compute_handover_readiness, get_risk_radar_summary

router = APIRouter(tags=["Continuity Intelligence"])

@router.get("/projects/{project_id}/readiness", response_model=ReadinessResponse)
def get_readiness_score(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return compute_handover_readiness(db, project_id)

@router.get("/projects/{project_id}/risks", response_model=RiskRadarSummary)
def get_project_risks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_risk_radar_summary(db, project_id)

@router.post("/projects/{project_id}/risks", response_model=RiskFindingResponse, status_code=status.HTTP_201_CREATED)
def create_project_risk(
    project_id: str,
    payload: RiskFindingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    finding = RiskFinding(
        project_id=project_id,
        category=payload.category,
        title=payload.title,
        severity=payload.severity,
        description=payload.description,
        affected_entity=payload.affected_entity,
        mitigation=payload.mitigation,
        resolution_status=payload.resolution_status or "open",
        evidence_reference=payload.evidence_reference
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding

@router.patch("/projects/{project_id}/risks/{risk_id}", response_model=RiskFindingResponse)
def update_project_risk(
    project_id: str,
    risk_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    finding = db.query(RiskFinding).filter(
        RiskFinding.id == risk_id,
        RiskFinding.project_id == project_id
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Risk finding not found")
    finding.resolution_status = status
    db.commit()
    db.refresh(finding)
    return finding

@router.get("/projects/{project_id}/bus-factor", response_model=List[BusFactorItemResponse])
def get_bus_factor(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(BusFactorItem).filter(BusFactorItem.project_id == project_id).all()
    return items
