"""FastAPI Route Integration Tests for Intent Classification
Phase 6.4 - SDS Voice Intelligence
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.schemas.intent_schemas import IntentClassifyResponse


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_llm_service(monkeypatch):
    """Cleanly mocks get_llm_service() in the route layer to avoid network connection latency."""
    mock_service = MagicMock()
    monkeypatch.setattr("app.routes.intent_routes.get_llm_service", lambda: mock_service)
    return mock_service


def test_classify_intent_successful_endpoint(client, mock_llm_service):
    """Verify standard valid intent classification request returns HTTP 200 with structured payload."""
    mock_classified = IntentClassifyResponse(
        success=True,
        intent="billing_enquiry",
        department="Billing",
        confidence=0.92,
        urgency="normal",
        summary="Caller checking latest invoice amount.",
        extracted_entities={"invoice": "INV-1234"},
        suggested_response="I can certainly help you review your invoice details.",
        requires_clarification=False,
        clarification_question=None,
        fallback_used=False,
        request_id="test-req-001",
        processing_time=0.15,
    )
    mock_llm_service.classify_intent.return_value = mock_classified

    payload = {
        "transcription": "I am calling about invoice INV-1234, can you explain the charge?",
        "language": "en",
        "correlation_id": "test-req-001",
    }
    res = client.post("/api/v1/intent/classify", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["intent"] == "billing_enquiry"
    assert data["department"] == "Billing"
    assert data["confidence"] == 0.92
    assert data["extracted_entities"]["invoice"] == "INV-1234"
    assert data["fallback_used"] is False
    assert "X-Request-ID" in res.headers


def test_classify_intent_empty_text_error_400(client):
    """Verify empty or whitespace-only transcription returns HTTP 400."""
    payload = {"transcription": "    "}
    res = client.post("/api/v1/intent/classify", json=payload)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("EMPTY_TRANSCRIPTION_TEXT", "VALIDATION_ERROR")


def test_classify_intent_excessively_long_text_error_400(client):
    """Verify transcription exceeding max length returns HTTP 400."""
    huge_text = "word " * (settings.MAX_TRANSCRIPTION_LENGTH // 4 + 10)
    payload = {"transcription": huge_text}
    res = client.post("/api/v1/intent/classify", json=payload)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("TRANSCRIPTION_TOO_LONG", "VALIDATION_ERROR")


def test_classify_intent_missing_field_error_400(client):
    """Verify missing required transcription field returns HTTP 400."""
    payload = {"language": "en"}
    res = client.post("/api/v1/intent/classify", json=payload)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_classify_intent_fallback_response(client, mock_llm_service):
    """Verify fallback response returns HTTP 200 with fallback_used=True and department=None."""
    mock_fallback = IntentClassifyResponse(
        success=True,
        intent="unknown",
        department=None,
        confidence=0.0,
        urgency="normal",
        summary="Unable to determine intent from speech.",
        extracted_entities={},
        suggested_response="I'm sorry, I didn't quite catch that. Could you please describe how I can help?",
        requires_clarification=True,
        clarification_question="Could you please briefly state what you need?",
        fallback_used=True,
        request_id="fallback-req",
        processing_time=0.05,
    )
    mock_llm_service.classify_intent.return_value = mock_fallback

    payload = {"transcription": "random garbled unintelligible noise"}
    res = client.post("/api/v1/intent/classify", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["intent"] == "unknown"
    assert data["department"] is None
    assert data["fallback_used"] is True
    assert data["requires_clarification"] is True


def test_root_endpoint_includes_intent_endpoint(client):
    """Verify the root discovery endpoint lists the new intent classification route."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "endpoints" in data
    assert "/api/v1/intent/classify" in data["endpoints"].values()
