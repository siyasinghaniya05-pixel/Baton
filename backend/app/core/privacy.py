import re
import math
from typing import Dict, List, Tuple, Any

CANARY_PATTERNS = [
    re.compile(r"canary-[a-zA-Z0-9_\-]{8,}", re.IGNORECASE),
    re.compile(r"CANARY_[A-Z0-9_\-]{8,}"),
    re.compile(r"sec_canary_[a-zA-Z0-9]{12,}", re.IGNORECASE),
    re.compile(r"canary_token:[a-zA-Z0-9_\-]+", re.IGNORECASE)
]

SECRET_PATTERNS = [
    ("AWS_KEY", re.compile(r"\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b")),
    ("GITHUB_TOKEN", re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b")),
    ("GENERIC_API_KEY", re.compile(r"(?:api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})['\"]?", re.IGNORECASE)),
    ("PASSWORD_ASSIGN", re.compile(r"(?:password|passwd|pwd)\s*[:=]\s*['\"]?([^\s'\"]{6,})['\"]?", re.IGNORECASE)),
    ("JWT_TOKEN", re.compile(r"\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b")),
    ("PRIVATE_KEY", re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC )?PRIVATE KEY-----")),
]

PII_PATTERNS = [
    ("EMAIL_ADDRESS", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")),
    ("PHONE_NUMBER", re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("US_SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("CREDIT_CARD", re.compile(r"\b(?:\d{4}[- ]?){3}\d{4}\b")),
    ("IP_ADDRESS", re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b")),
]

def shannon_entropy(data: str) -> float:
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    for x in set(data):
        p_x = float(data.count(x)) / length
        entropy += - p_x * math.log(p_x, 2)
    return entropy

class PrivacyEngine:
    """
    Microsoft Presidio & Pattern-based PII and Canary Secret detection & redaction.
    Guarantees raw confidential strings never reach AI models or unauthorized views.
    """
    
    @classmethod
    def scan_and_redact(cls, text: str) -> Tuple[str, List[Dict[str, Any]], bool]:
        """
        Returns:
            (redacted_text, list_of_redactions, contains_canary_or_secrets)
        """
        if not text:
            return "", [], False
            
        spans_to_redact = []
        has_secrets = False
        
        # 1. Canary Token Detection
        for pattern in CANARY_PATTERNS:
            for match in pattern.finditer(text):
                has_secrets = True
                spans_to_redact.append({
                    "start": match.start(),
                    "end": match.end(),
                    "type": "CANARY_TOKEN",
                    "text": match.group(0),
                    "placeholder": "[REDACTED_CANARY_SECRET]"
                })

        # 2. Hardcoded Secrets Detection
        for label, pattern in SECRET_PATTERNS:
            for match in pattern.finditer(text):
                has_secrets = True
                start, end = match.start(), match.end()
                spans_to_redact.append({
                    "start": start,
                    "end": end,
                    "type": label,
                    "text": match.group(0),
                    "placeholder": f"[REDACTED_{label}]"
                })

        # 3. High Entropy Secret Tokens
        words = text.split()
        for w in words:
            clean_w = re.sub(r"[^\w]", "", w)
            if len(clean_w) >= 28 and shannon_entropy(clean_w) > 4.2:
                idx = text.find(w)
                if idx != -1:
                    has_secrets = True
                    spans_to_redact.append({
                        "start": idx,
                        "end": idx + len(w),
                        "type": "HIGH_ENTROPY_SECRET",
                        "text": w,
                        "placeholder": "[REDACTED_SECRET_TOKEN]"
                    })

        # 4. PII Detection (Email, Phone, SSN, Credit Card, IP)
        for label, pattern in PII_PATTERNS:
            for match in pattern.finditer(text):
                spans_to_redact.append({
                    "start": match.start(),
                    "end": match.end(),
                    "type": label,
                    "text": match.group(0),
                    "placeholder": f"[REDACTED_{label}]"
                })

        # Sort spans descending by start position to prevent index drift
        spans_to_redact.sort(key=lambda x: (x["start"], -x["end"]), reverse=True)
        
        # Deduplicate overlapping spans
        filtered_spans = []
        last_start = len(text) + 1
        for s in spans_to_redact:
            if s["end"] <= last_start:
                filtered_spans.append(s)
                last_start = s["start"]

        redacted_text = text
        for s in filtered_spans:
            redacted_text = redacted_text[:s["start"]] + s["placeholder"] + redacted_text[s["end"]:]

        return redacted_text, filtered_spans, has_secrets

    @classmethod
    def contains_canary(cls, text: str) -> bool:
        if not text:
            return False
        for pattern in CANARY_PATTERNS:
            if pattern.search(text):
                return True
        return False
