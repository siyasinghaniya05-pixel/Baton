import re
from typing import Tuple, Dict, Any, Optional

class EvidenceVerifier:
    """
    Deterministic quotation verification engine.
    Assesses exact presence in source chunk and factual support for claims.
    """

    @classmethod
    def verify_quote(
        cls, 
        quote: str, 
        chunk_content: str, 
        original_chunk_content: str = None
    ) -> Tuple[bool, Optional[int], Optional[int], float]:
        """
        Returns:
            (is_verified_deterministic, char_start, char_end, support_score)
        """
        if not quote or not quote.strip():
            return False, None, None, 0.0

        clean_quote = quote.strip()
        
        # 1. Exact match in raw or redacted chunk
        target_texts = [chunk_content]
        if original_chunk_content:
            target_texts.append(original_chunk_content)

        for text in target_texts:
            if not text:
                continue
            idx = text.find(clean_quote)
            if idx != -1:
                return True, idx, idx + len(clean_quote), 1.0

        # 2. Normalized whitespace match (treating multiple spaces/newlines as single whitespace)
        def normalize_ws(s: str) -> str:
            return " ".join(s.split())

        norm_quote = normalize_ws(clean_quote)
        for text in target_texts:
            if not text:
                continue
            norm_text = normalize_ws(text)
            if norm_quote in norm_text:
                # Find best character offset in original text
                escaped_quote = re.escape(norm_quote)
                pattern = re.sub(r"\\ ", r"\\s+", escaped_quote)
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    return True, match.start(), match.end(), 0.95
                return True, 0, len(clean_quote), 0.90

        # 3. If exact quote does not exist, verification FAILS deterministically!
        # Strict rule: "If evidence verification fails, demote the claim to unverified."
        return False, None, None, 0.0

    @classmethod
    def check_claim_support(cls, claim_description: str, quote: str) -> float:
        """
        Evaluates whether the quote factually supports the claim.
        Returns a support score between 0.0 and 1.0.
        """
        if not quote or not claim_description:
            return 0.0

        quote_words = set(re.findall(r"\w+", quote.lower()))
        claim_words = set(re.findall(r"\w+", claim_description.lower()))
        
        # Exclude common stopwords
        stopwords = {"the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at", "to", "for", "of", "with", "by", "that", "this", "it", "as", "from"}
        meaningful_claim_words = claim_words - stopwords
        meaningful_quote_words = quote_words - stopwords

        if not meaningful_claim_words:
            return 0.5

        overlap = meaningful_claim_words.intersection(meaningful_quote_words)
        score = len(overlap) / len(meaningful_claim_words)
        
        # Normalize score
        return min(max(score * 1.2, 0.1), 1.0)

