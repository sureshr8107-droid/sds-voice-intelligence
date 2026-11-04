"""FastAPI Integration Tests for Conversation Pipeline Route
Phase 6.6 - SDS Voice Intelligence
"""
import base64
import io
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.schemas.conversation_schemas import ConversationPipelineResponse, AudioMetadata
from app.services.audio_service import (
    AudioProcessingError,
    EmptyAudioError,
    CorruptedAudioError,
    InvalidAudioFormatError,
    AudioSizeLimitExceededError,
)
from app.services.whisper_service import STTServiceError
from app.services.piper_service import (
    TTSServiceError,
    PiperNotFoundError,
    TTSTimeoutError,
    TTSSynthesisError,
)

# Standard 1-second 22,050 Hz 16-bit mono dummy WAV bytes
DUMMY_SYNTHESIZED_WAV = (
    b"RIFF\x24\xac\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x22\x56\x00\x00\x44\xac\x00\x00\x02\x00\x10\x00data\x00\xac\x00\x00"
    + b"\x00" * 44100
)

# 1-second 16,000 Hz 16-bit mono valid input WAV dummy bytes
DUMMY_INPUT_WAV = (
    b"RIFF\x24\x7d\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00}\x00\x00"
    + b"\x00" * 32000
)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_conversation_service(monkeypatch):
    """Mocks get_conversation_service() in the route layer for controlled test conditions."""
    mock_service = MagicMock()
    b64_audio = base64.b64encode(DUMMY_SYNTHESIZED_WAV).decode("utf-8")
    meta = AudioMetadata(
        format="wav",
        sample_rate=22050,
        channels=1,
        bit_depth=16,
        duration=1.0,
        size_bytes=len(DUMMY_SYNTHESIZED_WAV),
    )
    mock_service.process_conversation.return_value = ConversationPipelineResponse(
        success=True,
        request_id="test-conv-001",
        transcript="I have a billing question regarding my recent statement.",
        intent="billing_enquiry",
        department="Billing",
        confidence=0.92,
        urgency="normal",
        summary="Caller asking about billing statement.",
        response_text="I would be happy to connect you with our Billing department.",
        requires_clarification=False,
        clarification_question=None,
        fallback_used=False,
        audio_metadata=meta,
        audio=meta,
        audio_base64=b64_audio,
        processing_time=0.85,
    )
    monkeypatch.setattr(
        "app.routes.conversation_routes.get_conversation_service",
        lambda: mock_service,
    )
    return mock_service


# ==========================================
# 1. Successful Route Execution Tests
# ==========================================

def test_process_audio_endpoint_successful(client, mock_conversation_service):
    """Verify POST /api/v1/conversation/process-audio returns HTTP 200 with structured response."""
    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post(
        "/api/v1/conversation/process-audio",
        files=files,
        headers={"X-Request-ID": "test-conv-001"},
    )

    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["request_id"] == "test-conv-001"
    assert data["intent"] == "billing_enquiry"
    assert data["department"] == "Billing"
    assert data["confidence"] == 0.92
    assert "Billing department" in data["response_text"]
    assert data["requires_clarification"] is False
    assert data["fallback_used"] is False

    # Audio metadata fields
    assert "audio_metadata" in data
    assert data["audio_metadata"]["format"] == "wav"
    assert data["audio_metadata"]["sample_rate"] == 22050
    assert data["audio_metadata"]["channels"] == 1
    assert data["audio_metadata"]["duration"] == 1.0

    # Base64 WAV decoding and RIFF header verification
    assert "audio_base64" in data
    raw_wav = base64.b64decode(data["audio_base64"])
    assert raw_wav[:4] == b"RIFF"
    assert raw_wav[8:12] == b"WAVE"

    # Response headers
    assert res.headers.get("X-Request-ID") == "test-conv-001"
    assert "X-Audio-Duration" in res.headers
    assert "X-Process-Time" in res.headers


def test_process_audio_with_speed_parameter(client, mock_conversation_service):
    """Verify custom speed parameter is accepted and passed to service."""
    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post(
        "/api/v1/conversation/process-audio",
        files=files,
        data={"speed": 1.25},
    )

    assert res.status_code == 200
    mock_conversation_service.process_conversation.assert_called_once()
    _, kwargs = mock_conversation_service.process_conversation.call_args
    assert kwargs.get("speed") == 1.25


# ==========================================
# 2. Input Validation Error Tests
# ==========================================

def test_process_audio_invalid_speed_bounds_error_400(client):
    """Verify out-of-bounds speed returns HTTP 400."""
    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}

    # Speed too low (< 0.5)
    res_low = client.post("/api/v1/conversation/process-audio", files=files, data={"speed": 0.2})
    assert res_low.status_code == 400
    assert res_low.json()["error"]["code"] == "INVALID_TTS_INPUT"

    # Speed too high (> 2.0)
    res_high = client.post("/api/v1/conversation/process-audio", files=files, data={"speed": 3.0})
    assert res_high.status_code == 400
    assert res_high.json()["error"]["code"] == "INVALID_TTS_INPUT"


def test_process_audio_empty_file_error_400(client, mock_conversation_service):
    """Verify empty uploaded audio returns HTTP 400."""
    mock_conversation_service.process_conversation.side_effect = EmptyAudioError(
        "The uploaded audio file is empty (0 bytes)."
    )

    files = {"file": ("empty.wav", b"", "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "EMPTY_AUDIO_FILE"


def test_process_audio_corrupted_file_error_400(client, mock_conversation_service):
    """Verify corrupted audio payload returns HTTP 400."""
    mock_conversation_service.process_conversation.side_effect = CorruptedAudioError(
        "The uploaded file header does not match a valid audio format."
    )

    files = {"file": ("corrupt.wav", b"NOT_A_VALID_WAV_FILE", "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CORRUPTED_AUDIO_FILE"


def test_process_audio_invalid_extension_error_400(client, mock_conversation_service):
    """Verify unsupported audio format extension returns HTTP 400."""
    mock_conversation_service.process_conversation.side_effect = InvalidAudioFormatError(
        "Unsupported audio format '.txt'."
    )

    files = {"file": ("test.txt", b"plain text", "text/plain")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_AUDIO_FORMAT"


def test_process_audio_oversized_file_error_413(client, monkeypatch):
    """Verify file exceeding MAX_UPLOAD_SIZE_BYTES returns HTTP 413."""
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)

    files = {"file": ("oversized.wav", b"A" * 200, "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 413
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "AUDIO_SIZE_LIMIT_EXCEEDED"


# ==========================================
# 3. Subsystem Availability & Error Tests
# ==========================================

def test_process_audio_whisper_unavailable_error_503(client, mock_conversation_service):
    """Verify Whisper subsystem unavailability returns HTTP 503."""
    mock_conversation_service.process_conversation.side_effect = STTServiceError(
        "Whisper STT service is unavailable.", status_code=503, code="STT_UNAVAILABLE"
    )

    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 503
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "STT_UNAVAILABLE"


def test_process_audio_piper_unavailable_error_503(client, mock_conversation_service):
    """Verify Piper TTS unavailability returns HTTP 503."""
    mock_conversation_service.process_conversation.side_effect = PiperNotFoundError(
        "Piper binary unavailable."
    )

    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 503
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PIPER_UNAVAILABLE"


def test_process_audio_tts_timeout_error_504(client, mock_conversation_service):
    """Verify speech synthesis timeout returns HTTP 504."""
    mock_conversation_service.process_conversation.side_effect = TTSTimeoutError(
        "Speech synthesis timed out."
    )

    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 504
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "TTS_TIMEOUT"


def test_process_audio_pipeline_unexpected_error_500(client, mock_conversation_service):
    """Verify unhandled pipeline exception returns HTTP 500 with sanitized message."""
    mock_conversation_service.process_conversation.side_effect = RuntimeError(
        "System explosion at C:\\Users\\DHANYA\\internal"
    )

    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    assert res.status_code == 500
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
    assert "C:\\Users\\" not in res.text
    assert "Traceback" not in res.text


def test_process_audio_no_path_leakage(client, mock_conversation_service):
    """Verify internal system paths or tracebacks are never exposed in error responses."""
    mock_conversation_service.process_conversation.side_effect = AudioProcessingError(
        "Failed to convert at E:\\tools\\ffmpeg\\bin\\ffmpeg.exe"
    )

    files = {"file": ("call.wav", DUMMY_INPUT_WAV, "audio/wav")}
    res = client.post("/api/v1/conversation/process-audio", files=files)

    # Even though message is returned, verify stack trace is not dumped
    assert "Traceback (most recent call last)" not in res.text


def test_root_endpoint_includes_conversation_endpoint(client):
    """Verify root endpoint exposes the conversation processing endpoint."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "endpoints" in data
    assert "/api/v1/conversation/process-audio" in data["endpoints"].values()
    assert "Phase 6.6" in data.get("phase", "")

