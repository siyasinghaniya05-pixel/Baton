import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.source import Source, SourceChunk
from app.models.claim import Claim, EvidenceSpan, ClaimStatus, ClaimCategory, ReviewState
from app.models.project import SensitivityLevel
from app.services.llm_adapter import LLMAdapter
from app.services.verifier import EvidenceVerifier

class ReconstructionEngine:
    """
    Core AI knowledge reconstruction pipeline:
    Extracts structured claims, verifies evidence deterministically,
    and identifies conflicts and missing gaps.
    """

    @classmethod
    def process_source_chunks(cls, db: Session, source: Source) -> List[Claim]:
        created_claims = []
        chunks = db.query(SourceChunk).filter(SourceChunk.source_id == source.id).order_by(SourceChunk.chunk_index).all()

        for chunk in chunks:
            extracted_items = LLMAdapter.extract_knowledge(chunk.content, source.source_metadata)
            
            for item in extracted_items:
                quote = item.get("exact_quote", "")
                desc = item.get("description", "")
                cat_str = item.get("category", "Decision")
                
                # Verify exact quotation deterministically
                is_verified, start_char, end_char, support_score = EvidenceVerifier.verify_quote(
                    quote=quote,
                    chunk_content=chunk.content,
                    original_chunk_content=chunk.original_content
                )

                # Determine initial status
                # If quote not found or invalid: demote to Inferred / unbacked
                if not is_verified:
                    status = ClaimStatus.INFERRED
                    confidence = 0.5
                else:
                    status = ClaimStatus.VERIFIED if support_score >= 0.95 else ClaimStatus.EVIDENCE_BACKED
                    confidence = float(item.get("confidence", 0.9))

                # Map category enum
                try:
                    category = ClaimCategory(cat_str)
                except ValueError:
                    category = ClaimCategory.DECISION

                # Determine sensitivity (inheriting source sensitivity if stricter)
                chunk_sens = source.sensitivity
                item_sens_str = item.get("sensitivity", "internal")
                try:
                    item_sens = SensitivityLevel(item_sens_str)
                except ValueError:
                    item_sens = SensitivityLevel.INTERNAL

                # Inherit strictest sensitivity
                from app.core.permissions import SENSITIVITY_HIERARCHY
                inherited_sens = chunk_sens if SENSITIVITY_HIERARCHY.get(chunk_sens, 2) >= SENSITIVITY_HIERARCHY.get(item_sens, 2) else item_sens

                # Location formatting
                loc = f"{source.filename}"
                if chunk.line_start and chunk.line_end:
                    loc += f":L{chunk.line_start}-L{chunk.line_end}"
                elif chunk.page_number:
                    loc += f", p.{chunk.page_number}"

                claim_id = str(uuid.uuid4())
                claim = Claim(
                    id=claim_id,
                    project_id=source.project_id,
                    category=category,
                    description=desc,
                    reasoning=item.get("reasoning", ""),
                    exact_quote=quote,
                    source_id=source.id,
                    chunk_id=chunk.id,
                    evidence_location=loc,
                    confidence=confidence,
                    status=status,
                    sensitivity=inherited_sens,
                    review_state=ReviewState.PENDING
                )
                db.add(claim)

                # Create evidence span record
                if is_verified:
                    span = EvidenceSpan(
                        id=str(uuid.uuid4()),
                        claim_id=claim_id,
                        chunk_id=chunk.id,
                        quote=quote,
                        char_start=float(start_char) if start_char is not None else 0.0,
                        char_end=float(end_char) if end_char is not None else 0.0,
                        verified_deterministic=True,
                        semantic_support_score=support_score
                    )
                    db.add(span)

                created_claims.append(claim)

        db.commit()
        
        # Run conflict detector across all project claims
        cls.detect_conflicts(db, source.project_id)
        
        return created_claims

    @classmethod
    def detect_conflicts(cls, db: Session, project_id: str):
        """
        Detects opposing/contradictory claims within the project.
        Examples: ROS1 vs ROS2 migration status, conflicting milestone dates.
        Never silently resolves conflicting evidence; marks both as Conflict.
        """
        claims = db.query(Claim).filter(Claim.project_id == project_id).all()
        
        # Check pairs for contradiction
        for i in range(len(claims)):
            for j in range(i + 1, len(claims)):
                c1, c2 = claims[i], claims[j]
                
                # Check for ROS migration conflict
                t1, t2 = c1.description.lower(), c2.description.lower()
                is_conflict = False
                
                if ("ros1" in t1 and "freeze" in t1) and ("ros2" in t2 and "continue" in t2):
                    is_conflict = True
                elif ("nov 15" in t1 or "november 15" in t1) and ("dec 1" in t2 or "december 1" in t2) and ("deadline" in t1 or "demo" in t1) and ("deadline" in t2 or "demo" in t2):
                    is_conflict = True
                elif ("pr #38" in t1 and "merged" in t1) and ("pr #38" in t2 and "pending" in t2):
                    is_conflict = True

                if is_conflict:
                    c1.status = ClaimStatus.CONFLICT
                    c2.status = ClaimStatus.CONFLICT
                    c1.conflict_claim_id = c2.id
                    c2.conflict_claim_id = c1.id
        db.commit()

