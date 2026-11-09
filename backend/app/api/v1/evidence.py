from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.claim import Claim, EvidenceSpan
from app.models.source import Source, SourceChunk
from app.core.security import get_current_user
from app.core.permissions import can_access_sensitivity
from app.services.verifier import EvidenceVerifier

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("/claim/{claim_id}")
def get_claim_evidence_inspection(
    claim_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if not can_access_sensitivity(current_user.role, claim.sensitivity):
        raise HTTPException(status_code=403, detail="Clearance level insufficient to access this evidence")

    source = None
    chunk = None
    if claim.source_id:
        source = db.query(Source).filter(Source.id == claim.source_id).first()
    if claim.chunk_id:
        chunk = db.query(SourceChunk).filter(SourceChunk.id == claim.chunk_id).first()

    # Look up evidence span
    span = db.query(EvidenceSpan).filter(EvidenceSpan.claim_id == claim.id).first()

    # Calculate real-time verification status
    chunk_text = chunk.content if chunk else ""
    is_verified, start_idx, end_idx, score = EvidenceVerifier.verify_quote(
        quote=claim.exact_quote or "",
        chunk_content=chunk_text,
        original_chunk_content=chunk.original_content if chunk else ""
    )
    support_score = EvidenceVerifier.check_claim_support(claim.description, claim.exact_quote or "")

    return {
        "claim": {
            "id": claim.id,
            "project_id": claim.project_id,
            "category": claim.category.value,
            "description": claim.description,
            "reasoning": claim.reasoning,
            "exact_quote": claim.exact_quote,
            "confidence": claim.confidence,
            "status": claim.status.value,
            "sensitivity": claim.sensitivity.value,
            "review_state": claim.review_state.value,
            "reviewer_notes": claim.reviewer_notes,
            "conflict_claim_id": claim.conflict_claim_id,
            "evidence_location": claim.evidence_location,
            "created_at": claim.created_at,
            "updated_at": claim.updated_at
        },
        "source": {
            "id": source.id if source else None,
            "filename": source.filename if source else "Unknown Source",
            "file_type": source.file_type.value if source else "markdown",
            "sensitivity": source.sensitivity.value if source else "internal",
            "created_at": source.created_at if source else None
        } if source else None,
        "chunk": {
            "id": chunk.id if chunk else None,
            "chunk_index": chunk.chunk_index if chunk else 0,
            "content": chunk_text,
            "line_start": chunk.line_start if chunk else None,
            "line_end": chunk.line_end if chunk else None,
            "page_number": chunk.page_number if chunk else None,
            "pii_redacted_count": len(chunk.pii_redacted_meta) if (chunk and chunk.pii_redacted_meta) else 0
        } if chunk else None,
        "verification": {
            "is_verified_deterministic": is_verified,
            "char_start": start_idx if start_idx is not None else (span.char_start if span else 0),
            "char_end": end_idx if end_idx is not None else (span.char_end if span else 0),
            "support_score": round(support_score, 2),
            "status_rationale": "Exact verbatim quotation grounded in verified source document" if is_verified else "Quotation mismatch or unverified inference"
        }
    }

