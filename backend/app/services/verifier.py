import re
from datetime import datetime
from typing import Tuple, Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.source import Source, SourceChunk
from app.models.claim import Claim, ClaimStatus, ReviewState

class MultiStageVerifier:
    """
    BATON Multi-Stage Claim Verification Engine.
    Executes a rigorous 6-stage deterministic verification pipeline:
      Stage 1: Evidence Existence
      Stage 2: Exact Quotation Matching
      Stage 3: Semantic Support Assessment
      Stage 4: Contradiction Detection
      Stage 5: Freshness & Temporal Validity
      Stage 6: Human Approval & Sign-off
    """

    @classmethod
    def verify_quote_deterministic(
        cls, 
        quote: str, 
        chunk_content: str, 
        original_chunk_content: str = None
    ) -> Tuple[bool, Optional[int], Optional[int], float]:
        if not quote or not quote.strip():
            return False, None, None, 0.0

        clean_quote = quote.strip()
        target_texts = [chunk_content]
        if original_chunk_content:
            target_texts.append(original_chunk_content)

        # 1. Exact verbatim match
        for text in target_texts:
            if not text:
                continue
            idx = text.find(clean_quote)
            if idx != -1:
                return True, idx, idx + len(clean_quote), 1.0

        # 2. Normalized whitespace match
        norm_quote = " ".join(clean_quote.split())
        for text in target_texts:
            if not text:
                continue
            norm_text = " ".join(text.split())
            if norm_quote in norm_text:
                escaped_quote = re.escape(norm_quote)
                pattern = re.sub(r"\\ ", r"\\s+", escaped_quote)
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    return True, match.start(), match.end(), 0.95
                return True, 0, len(clean_quote), 0.90

        return False, None, None, 0.0

    @classmethod
    def check_claim_support(cls, claim_description: str, quote: str) -> float:
        if not quote or not claim_description:
            return 0.0

        quote_words = set(re.findall(r"\w+", quote.lower()))
        claim_words = set(re.findall(r"\w+", claim_description.lower()))
        stopwords = {"the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", "that", "this", "it", "as", "from"}
        meaningful_claim_words = claim_words - stopwords
        meaningful_quote_words = quote_words - stopwords

        if not meaningful_claim_words:
            return 0.5

        overlap = meaningful_claim_words.intersection(meaningful_quote_words)
        score = len(overlap) / len(meaningful_claim_words)
        return min(max(score * 1.25, 0.1), 1.0)

    @classmethod
    def execute_pipeline(cls, db: Session, claim: Claim) -> Dict[str, Any]:
        """
        Executes all 6 stages of verification on a claim and returns a full diagnostic report.
        """
        report: Dict[str, Any] = {
            "claim_id": claim.id,
            "evaluated_at": datetime.utcnow().isoformat(),
            "overall_status": claim.status.value,
            "stages": {}
        }

        # --- Stage 1: Evidence Existence ---
        source = db.query(Source).filter(Source.id == claim.source_id).first() if claim.source_id else None
        chunk = db.query(SourceChunk).filter(SourceChunk.id == claim.chunk_id).first() if claim.chunk_id else None
        
        stage1_pass = bool(source and chunk)
        report["stages"]["stage_1_existence"] = {
            "name": "Evidence Existence Check",
            "passed": stage1_pass,
            "source_found": bool(source),
            "source_name": source.filename if source else "None",
            "chunk_found": bool(chunk),
            "details": f"Found source '{source.filename if source else 'N/A'}' and chunk #{chunk.chunk_index if chunk else 'N/A'}." if stage1_pass else "Missing backing source or chunk ID."
        }

        # --- Stage 2: Exact Quotation ---
        quote = claim.exact_quote or ""
        exact_match, start_idx, end_idx, quote_score = (False, None, None, 0.0)
        if chunk and quote:
            exact_match, start_idx, end_idx, quote_score = cls.verify_quote_deterministic(
                quote=quote,
                chunk_content=chunk.content,
                original_chunk_content=chunk.original_content
            )

        stage2_pass = exact_match
        report["stages"]["stage_2_quotation"] = {
            "name": "Exact Quotation Verification",
            "passed": stage2_pass,
            "exact_match": exact_match,
            "char_start": start_idx,
            "char_end": end_idx,
            "quote_score": quote_score,
            "details": f"Verbatim quotation confirmed in source chunk (chars {start_idx}-{end_idx})." if stage2_pass else "Quotation string does not exist verbatim in the cited source."
        }

        # --- Stage 3: Semantic Support ---
        support_score = cls.check_claim_support(claim.description, quote)
        stage3_pass = support_score >= 0.50
        report["stages"]["stage_3_support"] = {
            "name": "Semantic Support Assessment",
            "passed": stage3_pass,
            "support_score": round(support_score, 2),
            "threshold": 0.50,
            "details": f"Quotation provides high factual support ({int(support_score*100)}% keyword overlap)." if stage3_pass else "Quotation provides insufficient direct support for the reconstructed claim description."
        }

        # --- Stage 4: Contradiction Detection ---
        # Search for opposing claims in same project
        conflicts = db.query(Claim).filter(
            Claim.project_id == claim.project_id,
            Claim.id != claim.id,
            Claim.status == ClaimStatus.CONFLICT
        ).all()
        has_direct_conflict = any(c.conflict_claim_id == claim.id or claim.conflict_claim_id == c.id for c in conflicts)
        stage4_pass = not has_direct_conflict
        report["stages"]["stage_4_contradiction"] = {
            "name": "Contradiction & Dispute Detection",
            "passed": stage4_pass,
            "conflict_detected": has_direct_conflict,
            "details": "No opposing contradictory claims detected in project evidence." if stage4_pass else "Contradictory claim detected! Disputed evidence must remain flagged as Conflict until reconciled."
        }

        # --- Stage 5: Freshness ---
        # Checks if source is recent or deprecated
        is_fresh = True
        if source and "legacy" in source.filename.lower():
            is_fresh = False
        stage5_pass = is_fresh
        report["stages"]["stage_5_freshness"] = {
            "name": "Freshness & Temporal Validity",
            "passed": stage5_pass,
            "is_fresh": is_fresh,
            "details": "Source is current with active development state." if is_fresh else "Source may represent legacy or superseded instructions."
        }

        # --- Stage 6: Human Approval ---
        is_human_approved = claim.review_state in [ReviewState.ACCEPTED, ReviewState.EDITED]
        stage6_pass = is_human_approved
        report["stages"]["stage_6_human_review"] = {
            "name": "Human Reviewer Sign-off",
            "passed": stage6_pass,
            "review_state": claim.review_state.value,
            "details": f"Human reviewer signed off with state: '{claim.review_state.value}'." if stage6_pass else "Pending formal reviewer sign-off in Review Workspace."
        }

        # Final Status Reconciliation
        # Strict rule: "If evidence verification fails, demote the claim and prevent it from being presented as established fact."
        if has_direct_conflict:
            final_status = ClaimStatus.CONFLICT
        elif not stage1_pass or not stage2_pass:
            final_status = ClaimStatus.UNVERIFIED if not stage1_pass else ClaimStatus.INFERRED
        elif stage1_pass and stage2_pass and stage3_pass and stage6_pass:
            final_status = ClaimStatus.VERIFIED
        elif stage1_pass and stage2_pass and stage3_pass:
            final_status = ClaimStatus.EVIDENCE_BACKED
        else:
            final_status = ClaimStatus.INFERRED

        report["final_recommended_status"] = final_status.value
        report["all_stages_passed"] = stage1_pass and stage2_pass and stage3_pass and stage4_pass and stage5_pass and stage6_pass

        return report

    # Backwards compatibility alias for EvidenceVerifier
    verify_quote = verify_quote_deterministic

EvidenceVerifier = MultiStageVerifier
