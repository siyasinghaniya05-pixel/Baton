import os
import json
import re
from typing import Dict, List, Any, Optional
from app.config import settings

class LLMAdapter:
    """
    Swappable LLM adapter supporting Gemini, Claude, and Deterministic Structured Extractor.
    Guarantees temperature 0 and structured JSON output.
    """

    @classmethod
    def extract_knowledge(cls, chunk_content: str, source_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Extracts structured claims from chunk content:
        Decisions, Decision reasoning, Task ownership, Pending tasks,
        Dependencies, Blockers, Risks, Recurring problems, Important contacts,
        Timeline milestones, and Open questions.
        """
        provider = settings.LLM_PROVIDER.lower()

        # Try Gemini if key is available
        if provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-pro", generation_config={"temperature": 0, "response_mime_type": "application/json"})
                prompt = cls._build_extraction_prompt(chunk_content)
                response = model.generate_content(prompt)
                extracted = json.loads(response.text)
                if isinstance(extracted, list):
                    return cls._sanitize_extracted_claims(extracted, chunk_content)
            except Exception as e:
                # Log error and fall back to deterministic extractor
                pass

        # Try Claude / Anthropic if key is available
        if provider == "claude" and settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                prompt = cls._build_extraction_prompt(chunk_content)
                message = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=4000,
                    temperature=0,
                    system="You are an expert knowledge handover extractor. Return ONLY valid JSON array.",
                    messages=[{"role": "user", "content": prompt}]
                )
                raw_text = message.content[0].text
                match = re.search(r"\[[\s\S]*\]", raw_text)
                if match:
                    extracted = json.loads(match.group(0))
                    return cls._sanitize_extracted_claims(extracted, chunk_content)
            except Exception:
                pass

        # Deterministic Structured Extractor (Offline / Zero-Hallucination Fallback)
        return cls._deterministic_extraction(chunk_content, source_metadata)

    @classmethod
    def _build_extraction_prompt(cls, chunk_content: str) -> str:
        return f"""You are the core intelligence of BATON – Evidence-Linked Knowledge Handover Platform.
Analyze the following source text and extract structured project knowledge.

STRICT RULES:
1. Every claim MUST include an 'exact_quote' copied VERBATIM from the text.
2. NEVER invent or fabricate a quote.
3. If an item is an inference rather than stated fact, set status to 'Inferred'.
4. Categories allowed:
   - "Decision"
   - "Decision Reasoning"
   - "Task Ownership"
   - "Pending Task"
   - "Dependency"
   - "Blocker"
   - "Risk"
   - "Recurring Problem"
   - "Important Contact"
   - "Deployment & Access"
   - "Timeline Milestone"
   - "Open Question"

JSON Schema output:
[
  {{
    "category": "Decision",
    "description": "Clear statement of the claim",
    "reasoning": "Underlying motivation if stated",
    "exact_quote": "VERBATIM text from input",
    "confidence": 1.0,
    "status": "Verified" | "Evidence-backed" | "Inferred",
    "sensitivity": "public" | "internal" | "confidential" | "restricted"
  }}
]

Text to analyze:
{chunk_content}
"""

    @classmethod
    def _sanitize_extracted_claims(cls, items: List[Dict[str, Any]], chunk_content: str) -> List[Dict[str, Any]]:
        sanitized = []
        for item in items:
            if not isinstance(item, dict):
                continue
            desc = item.get("description", "").strip()
            quote = item.get("exact_quote", "").strip()
            if not desc:
                continue
            # If quote not in chunk, ensure status is marked inferred or unverified
            if quote and quote not in chunk_content:
                item["status"] = "Inferred"
                item["confidence"] = 0.6
            sanitized.append(item)
        return sanitized

    @classmethod
    def _deterministic_extraction(cls, text: str, meta: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        High-precision pattern-matching extractor guaranteed to quote strictly verbatim.
        """
        extracted = []
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        for line in lines:
            lower = line.lower()
            
            # 1. Decisions & Reasoning
            if any(k in lower for k in ["decided to", "agreed to", "decision:", "chose to", "selected", "switched to", "migrating to"]):
                extracted.append({
                    "category": "Decision",
                    "description": line,
                    "reasoning": "Identified from project discussions/records",
                    "exact_quote": line,
                    "confidence": 0.95,
                    "status": "Evidence-backed",
                    "sensitivity": "internal"
                })

            # 2. Blockers & Critical Issues
            elif any(k in lower for k in ["blocked by", "blocker:", "blocking", "cannot proceed", "failed build", "critical bug"]):
                extracted.append({
                    "category": "Blocker",
                    "description": line,
                    "reasoning": "Direct impediment noted in source",
                    "exact_quote": line,
                    "confidence": 0.95,
                    "status": "Evidence-backed",
                    "sensitivity": "internal"
                })

            # 3. Task Ownership & Responsibilities
            elif any(k in lower for k in ["responsible for", "assigned to", "ownership:", "owner:", "will handle", "takes lead on"]):
                extracted.append({
                    "category": "Task Ownership",
                    "description": line,
                    "reasoning": "Role or task assignment",
                    "exact_quote": line,
                    "confidence": 0.92,
                    "status": "Evidence-backed",
                    "sensitivity": "internal"
                })

            # 4. Pending Tasks & PRs
            elif any(k in lower for k in ["todo:", "to-do", "pending:", "pr #", "pull request", "needs review", "in progress"]):
                extracted.append({
                    "category": "Pending Task",
                    "description": line,
                    "reasoning": "Uncompleted work item",
                    "exact_quote": line,
                    "confidence": 0.90,
                    "status": "Evidence-backed",
                    "sensitivity": "internal"
                })

            # 5. Risks & Recurring Problems
            elif any(k in lower for k in ["risk:", "warning:", "recurrent", "recurring", "keeps failing", "overheating", "drift"]):
                extracted.append({
                    "category": "Risk" if "risk" in lower else "Recurring Problem",
                    "description": line,
                    "reasoning": "Operational fragility or recurring issue",
                    "exact_quote": line,
                    "confidence": 0.88,
                    "status": "Evidence-backed",
                    "sensitivity": "internal"
                })

            # 6. Deployment & Access
            elif any(k in lower for k in ["credentials", "ssh key", "cloud account", "aws account", "api key", "deployment", "access to"]):
                extracted.append({
                    "category": "Deployment & Access",
                    "description": line,
                    "reasoning": "Infrastructure or credential reference",
                    "exact_quote": line,
                    "confidence": 0.90,
                    "status": "Evidence-backed",
                    "sensitivity": "confidential"
                })

            # 7. Important Contacts
            elif any(k in lower for k in ["contact:", "reach out to", "lead email", "sponsor:", "mentor:"]):
                extracted.append({
                    "category": "Important Contact",
                    "description": line,
                    "reasoning": "Key stakeholder or communication point",
                    "exact_quote": line,
                    "confidence": 0.90,
                    "status": "Evidence-backed",
                    "sensitivity": "internal"
                })

            # 8. Open Questions & Missing Info
            elif any(k in lower for k in ["unclear", "unknown", "who has", "where is", "deadline unconfirmed", "tbd", "question:"]):
                extracted.append({
                    "category": "Open Question",
                    "description": line,
                    "reasoning": "Unresolved query or information gap",
                    "exact_quote": line,
                    "confidence": 0.85,
                    "status": "Missing",
                    "sensitivity": "internal"
                })

        return extracted

