from app.core.privacy import PrivacyEngine
from app.services.handover_generator import HandoverGenerator
from app.models.user import UserRole
from app.models.claim import Claim, ClaimCategory, ClaimStatus
from app.models.project import SensitivityLevel

def test_canary_secret_redaction():
    text_with_canary = "The internal deployment uses canary-prod-token-9988-aether-restricted-7721 and secret key AKIA1234567890ABCDEF."
    redacted_text, spans, has_secrets = PrivacyEngine.scan_and_redact(text_with_canary)
    
    assert has_secrets is True
    assert "canary-prod-token-9988-aether-restricted-7721" not in redacted_text
    assert "AKIA1234567890ABCDEF" not in redacted_text
    assert "[REDACTED_CANARY_SECRET]" in redacted_text
    assert "[REDACTED_AWS_KEY]" in redacted_text

def test_handover_role_partitioning_no_leak():
    # Synthetic claim with sensitive canary
    sensitive_claim = Claim(
        id="claim-secret-001",
        project_id="proj-1",
        category=ClaimCategory.DEPLOYMENT_ACCESS,
        description="Production canary token canary-prod-token-9988-aether-restricted-7721 for AWS",
        exact_quote="canary-prod-token-9988-aether-restricted-7721",
        confidence=1.0,
        status=ClaimStatus.VERIFIED,
        sensitivity=SensitivityLevel.RESTRICTED
    )
    public_claim = Claim(
        id="claim-pub-001",
        project_id="proj-1",
        category=ClaimCategory.DECISION,
        description="Target University Robotics Showcase",
        exact_quote="Decided to target the University Robotics Showcase",
        confidence=1.0,
        status=ClaimStatus.VERIFIED,
        sensitivity=SensitivityLevel.PUBLIC
    )

    claims = [sensitive_claim, public_claim]

    # Compile view for Restricted Viewer
    guest_view = HandoverGenerator._build_role_view("ver-1", UserRole.RESTRICTED_VIEWER, claims)
    content_str = str(guest_view.compiled_content)
    
    assert "canary-prod-token-9988-aether-restricted-7721" not in content_str
    assert "[RESTRICTED ITEM: Content requires elevated clearance" in content_str
    assert guest_view.redacted_placeholders_count == 1
    assert guest_view.sensitive_items_count == 1

