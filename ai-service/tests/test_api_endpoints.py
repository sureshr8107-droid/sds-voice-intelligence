"""FastAPI Route Integration Tests
Phase 6.3 - SDS Voice Intelligence
"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.audio_service import FFmpegNotFoundError, AudioNormalizationError
from app.services.whisper_service import STTServiceError

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "test_16k.wav"


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert "endpoints" in data
    assert "X-Request-ID" in res.headers
    assert "X-Process-Time" in res.headers


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "sds-voice-intelligence-ai-service"
    assert data["stt"]["available"] is True
    assert data["ffmpeg"]["available"] is True
    assert "X-Request-ID" in res.headers


def test_transcribe_valid_audio(client):
    assert FIXTURE_PATH.is_file(), f"Fixture missing: {FIXTURE_PATH}"
    with open(FIXTURE_PATH, "rb") as fp:
        audio_bytes = fp.read()

    files = {"file": ("test_16k.wav", audio_bytes, "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "sds" in data["transcript"].lower()
    assert data["detected_language"] == "en"
    assert data["duration"] > 0
    assert data["processing_time"] > 0
    assert data["request_id"] == res.headers.get("X-Request-ID")


def test_transcribe_empty_file(client):
    files = {"file": ("empty.wav", b"", "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "EMPTY_AUDIO_FILE"


def test_transcribe_invalid_extension(client):
    files = {"file": ("notes.txt", b"plain text content", "text/plain")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_AUDIO_FORMAT"


def test_transcribe_corrupted_audio(client):
    files = {"file": ("broken.wav", b"RIFF\x00\x00\x00GARBAGE_PAYLOAD", "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CORRUPTED_AUDIO_FILE"


def test_transcribe_oversized_file(client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 50)
    files = {"file": ("huge.wav", b"\x00" * 100, "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 413
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "AUDIO_SIZE_LIMIT_EXCEEDED"


def test_transcribe_missing_file_parameter(client):
    res = client.post("/api/v1/audio/transcribe")
    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_transcribe_ffmpeg_unavailable_error_503(client, monkeypatch):
    from app.services.audio_service import audio_service

    def mock_process_upload(*args, **kwargs):
        raise FFmpegNotFoundError("FFmpeg executable unavailable.")

    monkeypatch.setattr(audio_service, "process_upload", mock_process_upload)

    files = {"file": ("test.wav", b"RIFF....WAVEfmt test", "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 503
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FFMPEG_UNAVAILABLE"


def test_transcribe_normalization_failure_error_500(client, monkeypatch):
    from app.services.audio_service import audio_service

    def mock_process_upload(*args, **kwargs):
        raise AudioNormalizationError("Audio transcoding encountered a fatal error.")

    monkeypatch.setattr(audio_service, "process_upload", mock_process_upload)

    files = {"file": ("test.wav", b"RIFF....WAVEfmt test", "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 500
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "AUDIO_NORMALIZATION_FAILED"


def test_transcribe_stt_failure_error_500(client, monkeypatch):
    from app.services.whisper_service import WhisperService

    def mock_transcribe(*args, **kwargs):
        raise STTServiceError("Model inference failed.")

    monkeypatch.setattr(WhisperService, "transcribe", mock_transcribe)

    assert FIXTURE_PATH.is_file()
    with open(FIXTURE_PATH, "rb") as fp:
        audio_bytes = fp.read()

    files = {"file": ("test_16k.wav", audio_bytes, "audio/wav")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    assert res.status_code == 500
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "STT_SERVICE_ERROR"


def test_error_response_no_path_leakage(client):
    """Verify that error responses do not leak absolute host paths or Python tracebacks."""
    files = {"file": ("bad.xyz", b"invalid data", "application/octet-stream")}
    res = client.post("/api/v1/audio/transcribe", files=files)

    raw_text = res.text
    # Ensure no drive roots or tracebacks are exposed
    assert "C:\\Users\\" not in raw_text
    assert "E:\\" not in raw_text
    assert "Traceback (most recent call last)" not in raw_text
