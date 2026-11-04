"""Optional Live Ollama Integration Test
Phase 6.4 - SDS Voice Intelligence

Runs live end-to-end intent inference against local Ollama daemon if available.
Automatically skips if Ollama is not currently running.
"""
import pytest
from app.services.llm_service import LLMService


def test_live_ollama_intent_classification():
    """Manual/Optional live test against real local Ollama instance."""
    service = LLMService()

    # Pre-check Ollama availability
    available, err = service.check_ollama_available()
    if not available:
        pytest.skip(f"Live Ollama not accessible at {service.base_url} ({err}). Skipping live test.")

    test_transcription = (
        "Hello, I am calling because my recent invoice INV-2024 has an unexpected charge "
        "of seventy five dollars and I need to speak to billing."
    )

    result = service.classify_intent(test_transcription)

    assert result.success is True
    assert result.intent in ("billing_enquiry", "payment_issue")
    assert result.department == "Billing"
    assert result.confidence >= 0.6
    assert result.fallback_used is False
    assert result.processing_time is not None
    assert result.processing_time > 0.0
