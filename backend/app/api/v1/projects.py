import uuid
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectMember, SensitivityLevel
from app.models.source import Source
from app.models.claim import Claim
from app.models.handover import HandoverVersion
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectMemberAdd, ProjectMemberOut
from app.core.security import get_current_user
from app.core.permissions import require_roles

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(Project).all()
    results = []
    for p in projects:
        src_cnt = db.query(Source).filter(Source.project_id == p.id).count()
        claim_cnt = db.query(Claim).filter(Claim.project_id == p.id).count()
        ho_cnt = db.query(HandoverVersion).filter(HandoverVersion.project_id == p.id).count()
        
        p_out = ProjectOut(
            id=p.id,
            name=p.name,
            slug=p.slug,
            description=p.description,
            repository_url=p.repository_url,
            created_by=p.created_by,
            created_at=p.created_at,
            updated_at=p.updated_at,
            total_sources=src_cnt,
            total_claims=claim_cnt,
            total_handovers=ho_cnt
        )
        results.append(p_out)
    return results

@router.post("", response_model=ProjectOut)
def create_project(
    p_in: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Enforce role: only Admin can create projects
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only Admins can create projects")

    base_slug = re.sub(r"[^a-zA-Z0-9]+", "-", p_in.name.lower()).strip("-")
    slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    
    project = Project(
        id=str(uuid.uuid4()),
        name=p_in.name,
        slug=slug,
        description=p_in.description,
        repository_url=p_in.repository_url,
        created_by=current_user.id
    )
    db.add(project)
    
    # Add creator as Admin member
    pm = ProjectMember(
        id=str(uuid.uuid4()),
        project_id=project.id,
        user_id=current_user.id,
        role=UserRole.ADMIN,
        max_sensitivity=SensitivityLevel.RESTRICTED
    )
    db.add(pm)
    db.commit()
    db.refresh(project)

    return ProjectOut(
        id=project.id,
        name=project.name,
        slug=project.slug,
        description=project.description,
        repository_url=project.repository_url,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at,
        total_sources=0,
        total_claims=0,
        total_handovers=0
    )

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Project).filter((Project.id == project_id) | (Project.slug == project_id)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    src_cnt = db.query(Source).filter(Source.project_id == p.id).count()
    claim_cnt = db.query(Claim).filter(Claim.project_id == p.id).count()
    ho_cnt = db.query(HandoverVersion).filter(HandoverVersion.project_id == p.id).count()

    return ProjectOut(
        id=p.id,
        name=p.name,
        slug=p.slug,
        description=p.description,
        repository_url=p.repository_url,
        created_by=p.created_by,
        created_at=p.created_at,
        updated_at=p.updated_at,
        total_sources=src_cnt,
        total_claims=claim_cnt,
        total_handovers=ho_cnt
    )

