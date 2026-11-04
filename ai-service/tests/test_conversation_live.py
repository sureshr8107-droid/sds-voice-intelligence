"""Live Integration Tests for Full Conversation Pipeline
Phase 6.6 - SDS Voice Intelligence
"""
import base64
import io
from pathlib import Path
import pytest
import soundfile as sf

from app.services.audio_service import audio_service
from app.services.whisper_service import get_whisper_service
from app.services.piper_service import get_piper_service
from app.services.conversation_service import get_conversation_service

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "test_16k.wav"


def test_live_conversation_pipeline_with_fixture():
    """Execute end-to-end pipeline using real test_16k.wav audio fixture and live local models."""
    if not FIXTURE_PATH.is_file():
        pytest.skip(f"Test fixture not found: {FIXTURE_PATH}")

    whisper = get_whisper_service()
    if not whisper.check_model_available():
        pytest.skip("Whisper base.en model is not available in local cache.")

    piper = get_piper_service()
    if not piper.check_piper_available() or not piper.check_model_available():
        pytest.skip("Piper binary or voice model is not available.")

    if not audio_service.check_ffmpeg_available():
        pytest.skip("FFmpeg is not available.")

    with open(FIXTURE_PATH, "rb") as fp:
        raw_audio = fp.read()

    conv_service = get_conversation_service()
    result = conv_service.process_conversation(
        audio_bytes=raw_audio,
        original_filename="test_16k.wav",
        request_id="live-test-001",
        speed=1.0,
    )

    assert result.success is True
    assert result.request_id == "live-test-001"
    assert len(result.transcript) > 0
    assert "sds" in result.transcript.lower() or "voice" in result.transcript.lower()
    assert result.intent is not None
    assert len(result.response_text) > 0
    assert result.audio_metadata.duration > 0
    assert result.audio_metadata.format == "wav"
    assert result.audio_metadata.sample_rate == 22050
    assert result.audio_metadata.channels == 1

    # Decode and validate base64 WAV
    wav_bytes = base64.b64decode(result.audio_base64)
    assert len(wav_bytes) > 1000
    assert wav_bytes[:4] == b"RIFF"
    assert wav_bytes[8:12] == b"WAVE"

    info = sf.info(io.BytesIO(wav_bytes))
    assert info.samplerate == 22050
    assert info.channels == 1
    assert info.subtype == "PCM_16"

