"""FastAPI Route Integration Tests for Text-to-Speech (TTS)
Phase 6.5 - SDS Voice Intelligence
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.piper_service import (
    PiperNotFoundError,
    VoiceModelNotFoundError,
    TTSTimeoutError,
    TTSSynthesisError,
)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_piper_service(monkeypatch):
    """Mocks get_piper_service() in the route layer for controlled error and performance testing."""
    mock_service = MagicMock()
    monkeypatch.setattr("app.routes.tts_routes.get_piper_service", lambda: mock_service)
    return mock_service


# Standard 1-second 22,050 Hz 16-bit mono WAV dummy bytes
DUMMY_WAV_BYTES = (
    b"RIFF\x24\xac\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x22\x56\x00\x00\x44\xac\x00\x00\x02\x00\x10\x00data\x00\xac\x00\x00"
    + b"\x00" * 44100
)


def test_synthesize_endpoint_successful(client, mock_piper_service):
    """Verify valid synthesis returns HTTP 200 with audio/wav media type and expected headers."""
    mock_piper_service.synthesize.return_value = (DUMMY_WAV_BYTES, 1.0)

    payload = {
        "text": "Hello, thank you for calling SDS Voice Intelligence.",
        "speed": 1.0,
    }
    res = client.post("/api/v1/tts/synthesize", json=payload, headers={"X-Request-ID": "tts-call-001"})

    assert res.status_code == 200
    assert res.headers.get("Content-Type") == "audio/wav"
    assert "tts_" in res.headers.get("Content-Disposition", "")
    assert res.headers.get("X-Request-ID") == "tts-call-001"
    assert "1.00s" in res.headers.get("X-Audio-Duration", "")
    assert "X-Process-Time" in res.headers
    assert res.content[:4] == b"RIFF"


def test_synthesize_empty_text_error_400(client):
    """Verify empty text returns HTTP 400."""
    res = client.post("/api/v1/tts/synthesize", json={"text": ""})

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("INVALID_TTS_INPUT", "VALIDATION_ERROR")


def test_synthesize_whitespace_only_text_error_400(client):
    """Verify whitespace-only text returns HTTP 400."""
    res = client.post("/api/v1/tts/synthesize", json={"text": "   \n\t   "})

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("INVALID_TTS_INPUT", "VALIDATION_ERROR")


def test_synthesize_excessively_long_text_error_400(client):
    """Verify text exceeding MAX_TTS_TEXT_LENGTH returns HTTP 400."""
    huge_text = "speech " * (settings.MAX_TTS_TEXT_LENGTH // 5 + 10)
    res = client.post("/api/v1/tts/synthesize", json={"text": huge_text})

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("INVALID_TTS_INPUT", "VALIDATION_ERROR")


def test_synthesize_missing_text_field_error_400(client):
    """Verify missing required text field returns HTTP 400."""
    res = client.post("/api/v1/tts/synthesize", json={"speed": 1.0})

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_synthesize_invalid_speed_bounds_error_400(client):
    """Verify out-of-bounds speed parameter returns HTTP 400."""
    # Speed too low (< 0.5)
    res_low = client.post("/api/v1/tts/synthesize", json={"text": "Hello", "speed": 0.2})
    assert res_low.status_code == 400

    # Speed too high (> 2.0)
    res_high = client.post("/api/v1/tts/synthesize", json={"text": "Hello", "speed": 3.5})
    assert res_high.status_code == 400


def test_synthesize_piper_unavailable_error_503(client, mock_piper_service):
    """Verify unavailable Piper binary returns HTTP 503."""
    mock_piper_service.synthesize.side_effect = PiperNotFoundError("Piper binary unavailable.")

    res = client.post("/api/v1/tts/synthesize", json={"text": "Hello"})
    assert res.status_code == 503
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PIPER_UNAVAILABLE"


def test_synthesize_voice_model_missing_error_503(client, mock_piper_service):
    """Verify missing voice model returns HTTP 503."""
    mock_piper_service.synthesize.side_effect = VoiceModelNotFoundError("Voice model missing.")

    res = client.post("/api/v1/tts/synthesize", json={"text": "Hello"})
    assert res.status_code == 503
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VOICE_MODEL_NOT_FOUND"


def test_synthesize_timeout_error_504(client, mock_piper_service):
    """Verify synthesis timeout returns HTTP 504."""
    mock_piper_service.synthesize.side_effect = TTSTimeoutError("Synthesis timed out.")

    res = client.post("/api/v1/tts/synthesize", json={"text": "Hello"})
    assert res.status_code == 504
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "TTS_TIMEOUT"


def test_synthesize_failure_error_500(client, mock_piper_service):
    """Verify synthesis process failure returns HTTP 500."""
    mock_piper_service.synthesize.side_effect = TTSSynthesisError("Synthesis failed.")

    res = client.post("/api/v1/tts/synthesize", json={"text": "Hello"})
    assert res.status_code == 500
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "TTS_SYNTHESIS_FAILED"


def test_error_response_no_path_leakage(client, mock_piper_service):
    """Verify internal filesystem paths and tracebacks are never exposed."""
    mock_piper_service.synthesize.side_effect = RuntimeError("Internal system fault: C:\\Users\\DHANYA\\tools\\piper")

    res = client.post("/api/v1/tts/synthesize", json={"text": "Hello"})
    raw = res.text

    assert "C:\\Users\\" not in raw
    assert "E:\\" not in raw
    assert "Traceback (most recent call last)" not in raw


def test_root_endpoint_includes_tts_endpoint(client):
    """Verify the root endpoint includes the new TTS synthesis endpoint."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "endpoints" in data
    assert "/api/v1/tts/synthesize" in data["endpoints"].values()
