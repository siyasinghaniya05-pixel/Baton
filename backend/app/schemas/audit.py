from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

class AuditLogOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

