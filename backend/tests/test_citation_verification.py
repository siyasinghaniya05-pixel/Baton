from app.services.verifier import EvidenceVerifier

def test_deterministic_quote_verification():
    chunk_text = "Decision: Decided to adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon."
    
    # Verbatim quote should pass
    exact_quote = "Decided to adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon."
    is_verified, start, end, score = EvidenceVerifier.verify_quote(exact_quote, chunk_text)
    assert is_verified is True
    assert start is not None
    assert score >= 0.95
    assert chunk_text[start:end] == exact_quote

    # Fabricated / altered quote must deterministically FAIL
    fabricated_quote = "Decided to adopt Zephyr OS on ESP32 microcontroller."
    is_verified_fake, _, _, _ = EvidenceVerifier.verify_quote(fabricated_quote, chunk_text)
    assert is_verified_fake is False

def test_semantic_support_scoring():
    claim = "Adopt micro-ROS on STM32 microcontroller for ROS2 DDS communication"
    quote = "Decided to adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon."
    score = EvidenceVerifier.check_claim_support(claim, quote)
    assert score > 0.5

    unrelated_quote = "Left drive motor driver thermal cutoff trips if continuous velocity exceeds 1.8 m/s."
    unrelated_score = EvidenceVerifier.check_claim_support(claim, unrelated_quote)
    assert unrelated_score < 0.3

