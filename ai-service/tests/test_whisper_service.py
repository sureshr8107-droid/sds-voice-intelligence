"""Unit and Integration Tests for WhisperService
Phase 6.3 - SDS Voice Intelligence
"""
import os
import concurrent.futures
from pathlib import Path
import pytest

from app.services.whisper_service import (
    WhisperService,
    get_whisper_service,
    STTServiceError,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "test_16k.wav"


def test_whisper_singleton():
    s1 = get_whisper_service()
    s2 = get_whisper_service()
    assert s1 is s2, "WhisperService should follow singleton pattern"


def test_whisper_model_availability():
    service = get_whisper_service()
    is_avail = service.check_model_available()
    assert is_avail is True, "Whisper base.en model should be present in local cache"


def test_whisper_model_availability_missing_cache(monkeypatch):
    service = WhisperService(model_name="nonexistent_model_xyz")
    # Simulate non-existent cache directory
    monkeypatch.setenv("HF_HOME", "/non/existent/hf/home")
    monkeypatch.setenv("HUGGINGFACE_HUB_CACHE", "/non/existent/hub")
    monkeypatch.setattr(Path, "home", lambda: Path("/non/existent/home"))

    is_avail = service.check_model_available()
    assert is_avail is False, "Should safely return False without raising exceptions"


def test_whisper_transcription_live():
    service = get_whisper_service()
    assert FIXTURE_PATH.is_file(), f"Fixture file not found: {FIXTURE_PATH}"

    result = service.transcribe(str(FIXTURE_PATH))

    assert "transcript" in result
    assert "detected_language" in result
    assert "language_probability" in result
    assert "duration" in result
    assert "processing_time" in result
    assert "real_time_factor" in result

    assert result["detected_language"] == "en"
    assert result["language_probability"] >= 0.8
    assert result["duration"] > 4.0

    transcript_lower = result["transcript"].lower()
    assert "sds" in transcript_lower
    assert "voice intelligence" in transcript_lower
    assert "how may i direct your call" in transcript_lower


def test_whisper_concurrent_inference_serialization():
    """Verify concurrent transcription requests are serialized safely through model lock."""
    service = get_whisper_service()
    assert FIXTURE_PATH.is_file()

    def run_transcribe(thread_idx: int):
        res = service.transcribe(str(FIXTURE_PATH))
        return thread_idx, res["transcript"]

    # Run 3 concurrent threads through ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(run_transcribe, i) for i in range(3)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert len(results) == 3
    for idx, transcript in results:
        assert "sds" in transcript.lower()


def test_whisper_nonexistent_file_rejection():
    service = get_whisper_service()
    with pytest.raises(STTServiceError) as exc_info:
        service.transcribe("/non/existent/audio.wav")
    assert "does not exist" in str(exc_info.value)
