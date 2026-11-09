import uuid
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, SensitivityLevel
from app.models.source import Source, SourceChunk, SourceType
from app.models.audit import AuditLog
from app.schemas.source import SourceOut, SourceChunkOut, SourceUploadResponse
from app.core.security import get_current_user
from app.services.ingestion import IngestionEngine
from app.services.reconstruction import ReconstructionEngine

router = APIRouter(prefix="/sources", tags=["Sources"])

@router.get("/project/{project_id}", response_model=List[SourceOut])
def list_project_sources(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sources = db.query(Source).filter(Source.project_id == project_id).order_by(Source.created_at.desc()).all()
    results = []
    for s in sources:
        c_cnt = db.query(SourceChunk).filter(SourceChunk.source_id == s.id).count()
        so = SourceOut(
            id=s.id,
            project_id=s.project_id,
            filename=s.filename,
            file_type=s.file_type,
            sensitivity=s.sensitivity,
            consent_confirmed=s.consent_confirmed,
            sha256_hash=s.sha256_hash,
            source_metadata=s.source_metadata or {},
            created_at=s.created_at,
            total_chunks=c_cnt
        )
        results.append(so)
    return results

@router.post("/upload", response_model=SourceUploadResponse)
async def upload_source(
    project_id: str = Form(...),
    sensitivity: SensitivityLevel = Form(SensitivityLevel.INTERNAL),
    consent_confirmed: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Admin or Leaver can upload project sources
    if current_user.role not in [UserRole.ADMIN, UserRole.LEAVER]:
        raise HTTPException(status_code=403, detail="Only Admins and Leavers can upload project sources")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file provided")

    sha256_hash = hashlib.sha256(file_bytes).hexdigest()
    filename = file.filename or "uploaded_source"
    
    # Infer source type from extension
    fname_lower = filename.lower()
    if fname_lower.endswith(".pdf"):
        stype = SourceType.PDF
    elif fname_lower.endswith(".csv"):
        stype = SourceType.CSV
    elif fname_lower.endswith(".json"):
        stype = SourceType.JSON
    elif any(fname_lower.endswith(ext) for ext in [".zip", ".tar", ".gz"]):
        stype = SourceType.REPO
    elif "chat" in fname_lower or "discord" in fname_lower or "slack" in fname_lower:
        stype = SourceType.CHAT
    else:
        stype = SourceType.MARKDOWN

    source_id = str(uuid.uuid4())
    source = Source(
        id=source_id,
        project_id=project_id,
        filename=filename,
        file_type=stype,
        sensitivity=sensitivity,
        consent_confirmed=consent_confirmed,
        sha256_hash=sha256_hash,
        source_metadata={"original_size": len(file_bytes)}
    )
    db.add(source)
    db.flush()

    # Ingest and parse based on type
    if stype == SourceType.PDF:
        chunks_data = IngestionEngine.parse_pdf(source_id, file_bytes)
    elif stype == SourceType.CSV:
        chunks_data = IngestionEngine.parse_csv(source_id, file_bytes.decode("utf-8", errors="ignore"))
    elif stype == SourceType.JSON:
        chunks_data = IngestionEngine.parse_json(source_id, file_bytes.decode("utf-8", errors="ignore"))
    elif stype == SourceType.REPO:
        chunks_data = IngestionEngine.parse_repo_export(source_id, file_bytes)
    elif stype == SourceType.CHAT:
        chunks_data = IngestionEngine.parse_chat(source_id, file_bytes.decode("utf-8", errors="ignore"))
    else:
        chunks_data = IngestionEngine.parse_markdown(source_id, file_bytes.decode("utf-8", errors="ignore"))

    total_redacted = 0
    contains_canary_or_secrets = False
    for cd in chunks_data:
        if cd["pii_redacted_meta"]:
            total_redacted += len(cd["pii_redacted_meta"])
        if cd.get("contains_secrets", False):
            contains_canary_or_secrets = True

        chunk = SourceChunk(
            id=cd["id"],
            source_id=source_id,
            chunk_index=cd["chunk_index"],
            content=cd["content"],
            original_content=cd["original_content"],
            line_start=cd["line_start"],
            line_end=cd["line_end"],
            page_number=cd["page_number"],
            byte_offset_start=cd["byte_offset_start"],
            byte_offset_end=cd["byte_offset_end"],
            pii_redacted_meta=cd["pii_redacted_meta"]
        )
        db.add(chunk)

    db.commit()

    # Trigger AI reconstruction pipeline
    created_claims = ReconstructionEngine.process_source_chunks(db, source)

    # Log action to append-only audit trail
    audit_entry = AuditLog(
        id=str(uuid.uuid4()),
        project_id=project_id,
        user_id=current_user.id,
        action="source_uploaded_and_reconstructed",
        target_type="source",
        target_id=source_id,
        details={
            "filename": filename,
            "chunks_count": len(chunks_data),
            "claims_extracted": len(created_claims),
            "redacted_items": total_redacted
        }
    )
    db.add(audit_entry)
    db.commit()

    so = SourceOut(
        id=source.id,
        project_id=source.project_id,
        filename=source.filename,
        file_type=source.file_type,
        sensitivity=source.sensitivity,
        consent_confirmed=source.consent_confirmed,
        sha256_hash=source.sha256_hash,
        source_metadata=source.source_metadata or {},
        created_at=source.created_at,
        total_chunks=len(chunks_data)
    )

    return SourceUploadResponse(
        source=so,
        chunks_created=len(chunks_data),
        redacted_items_count=total_redacted,
        contains_canary_or_secrets=contains_canary_or_secrets
    )

@router.get("/{source_id}/chunks", response_model=List[SourceChunkOut])
def get_source_chunks(source_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chunks = db.query(SourceChunk).filter(SourceChunk.source_id == source_id).order_by(SourceChunk.chunk_index).all()
    return chunks

