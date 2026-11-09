from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.source import SourceType
from app.models.project import SensitivityLevel

class SourceChunkOut(BaseModel):
    id: str
    source_id: str
    chunk_index: int
    content: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    page_number: Optional[int] = None
    pii_redacted_meta: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class SourceOut(BaseModel):
    id: str
    project_id: str
    filename: str
    file_type: SourceType
    sensitivity: SensitivityLevel
    consent_confirmed: bool
    sha256_hash: Optional[str] = None
    source_metadata: Dict[str, Any] = {}
    created_at: datetime
    total_chunks: int = 0

    class Config:
        from_attributes = True

class SourceUploadResponse(BaseModel):
    source: SourceOut
    chunks_created: int
    redacted_items_count: int
    contains_canary_or_secrets: bool

