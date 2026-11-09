import pytest
from datetime import datetime, timedelta
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.services.verifier import MultiStageVerifier
from app.models.user import User, UserRole
from app.models.claim import Claim, ClaimStatus, ReviewState
from app.schemas.auth import RegisterRequest

def test_password_hashing():
    pwd = "SecurePassword123!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

def test_jwt_session_claims():
    data = {"sub": "user-uuid-123", "email": "test@baton.local", "role": "admin"}
    token = create_access_token(data)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "user-uuid-123"
    assert decoded["email"] == "test@baton.local"
    assert decoded["role"] == "admin"
    assert "iat" in decoded
    assert "exp" in decoded
    assert "jti" in decoded

def test_multistage_quote_verification():
    content = "The STM32 microcontroller firmware runs micro-ROS agent connected via USB UART."
    quote = "micro-ROS agent connected via USB UART"
    
    passed, start, end, score = MultiStageVerifier.verify_quote_deterministic(quote, content)
    assert passed is True
    assert score >= 0.95
    assert content[start:end] == quote

    # Fabricated quote should fail deterministically
    fake_quote = "firmware runs FreeRTOS connected via Bluetooth"
    fake_passed, _, _, _ = MultiStageVerifier.verify_quote_deterministic(fake_quote, content)
    assert fake_passed is False

def test_semantic_support_scoring():
    claim = "Microcontroller communicates with ROS2 via UART micro-ROS"
    good_quote = "The STM32 microcontroller firmware runs micro-ROS agent connected via USB UART."
    score = MultiStageVerifier.check_claim_support(claim, good_quote)
    assert score > 0.4

    irrelevant_quote = "The team decided to order lunch from the Italian bistro downtown."
    bad_score = MultiStageVerifier.check_claim_support(claim, irrelevant_quote)
    assert bad_score < 0.2

