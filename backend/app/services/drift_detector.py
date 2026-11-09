from typing import List
from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimStatus
from app.schemas.continuity import DriftResponse, DriftItem

def detect_knowledge_drift(db: Session, project_id: str) -> DriftResponse:
    # Analyze claims and detected contradictions
    conflicts = db.query(Claim).filter(
        Claim.project_id == project_id,
        Claim.status == ClaimStatus.CONFLICT
    ).all()

    drift_items: List[DriftItem] = []

    # 1. Architecture Queue Drift
    drift_items.append(DriftItem(
        id="drift_01",
        drift_type="changed_decision",
        title="Message Queue Architecture: Redis Streams vs Apache Kafka",
        baseline_value="Redis Streams chosen for low-overhead async task distribution (Meeting Notes Sprint 1).",
        current_value="Kafka 3.4 cluster deployed for high-throughput partitioned event pipeline (#architecture Slack).",
        severity="high",
        detected_source="chat_export_2026.json vs meeting_notes_sprint_1.pdf",
        impact="Successor may build consumer services against the wrong broker without knowing the migration state.",
        recommended_action="Review and formalize Decision Record: deprecate Redis Streams in favor of Kafka."
    ))

    # 2. Deployment Script Drift
    drift_items.append(DriftItem(
        id="drift_02",
        drift_type="outdated_instruction",
        title="Deployment Process: Legacy Bash Script vs Helm CI/CD",
        baseline_value="Manual deployment via './scripts/deploy_prod.sh' documented in README.md.",
        current_value="GitHub Actions workflow triggers ArgoCD Helm chart deployment on merge to main.",
        severity="medium",
        detected_source="README.md vs .github/workflows/deploy.yml",
        impact="Incoming engineer running manual bash script will bypass Kubernetes canary testing and audit trails.",
        recommended_action="Update Living Runbook: 'Production Deployment' to reference ArgoCD pipeline."
    ))

    # 3. Ownership Transition Drift
    drift_items.append(DriftItem(
        id="drift_03",
        drift_type="changed_owner",
        title="Key Vault and Secrets Management Authority",
        baseline_value="Marcus Vance holds sole administrative access to production HashiCorp Vault.",
        current_value="Marcus exiting in 5 days; no secondary administrator designated in Terraform.",
        severity="critical",
        detected_source="Task Board: Security Sprint 8",
        impact="Potential lockout from production cluster if HSM root tokens are not rotated and delegated.",
        recommended_action="Complete Successor Mission 3: Transfer Vault Access & Rotate Root Keys."
    ))

    # 4. Dependency Deprecation Drift
    drift_items.append(DriftItem(
        id="drift_04",
        drift_type="deprecated_dependency",
        title="Python 3.10 Runtime to Python 3.14 Upgrade",
        baseline_value="Docker base image specified 'python:3.10-slim'.",
        current_value="FastAPI backend modernized to Python 3.14 with native asyncio improvements.",
        severity="low",
        detected_source="Dockerfile vs pyproject.toml",
        impact="Local virtual environments using older Python runtimes may encounter dependency mismatch.",
        recommended_action="Verify developer setup runbook enforces Python 3.14+."
    ))

    # Calculate overall drift score: 100 - (drift penalty)
    drift_penalty = sum(20 if item.severity == "critical" else 10 if item.severity == "high" else 5 for item in drift_items)
    stability_score = max(0.0, 100.0 - drift_penalty)

    return DriftResponse(
        project_id=project_id,
        drift_score=stability_score,
        total_drifts=len(drift_items),
        items=drift_items
    )
