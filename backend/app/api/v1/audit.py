from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.core.security import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("/project/{project_id}", response_model=List[AuditLogOut])
def get_project_audit_logs(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).filter(
        (AuditLog.project_id == project_id) | (AuditLog.project_id == None)
    ).order_by(AuditLog.created_at.desc()).limit(100).all()

    results = []
    for l in logs:
        u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        results.append(AuditLogOut(
            id=l.id,
            project_id=l.project_id,
            user_id=l.user_id,
            user_email=u.email if u else "System",
            user_name=u.full_name if u else "Automated System",
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            details=l.details or {},
            ip_address=l.ip_address,
            created_at=l.created_at
        ))
    return results

