"""Unit Tests for AudioService
Phase 6.3 - SDS Voice Intelligence
"""
import os
import subprocess
import pytest
import soundfile as sf
from pathlib import Path

from app.config import settings
from app.services.audio_service import (
    AudioService,
    EmptyAudioError,
    InvalidAudioFormatError,
    CorruptedAudioError,
    AudioSizeLimitExceededError,
    AudioDurationLimitExceededError,
    FFmpegNotFoundError,
    AudioNormalizationError,
    validate_audio_magic_bytes,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "test_16k.wav"


@pytest.fixture
def valid_audio_bytes() -> bytes:
    assert FIXTURE_PATH.is_file(), f"Fixture file missing: {FIXTURE_PATH}"
    with open(FIXTURE_PATH, "rb") as fp:
        return fp.read()


def test_valid_audio_normalization(valid_audio_bytes):
    service = AudioService()
    temp_wav_recorded = None

    with service.process_upload(valid_audio_bytes, "incoming.wav") as (wav_path, duration):
        temp_wav_recorded = wav_path
        assert os.path.isfile(wav_path)
        info = sf.info(wav_path)
        assert info.samplerate == 16000
        assert info.channels == 1
        assert info.subtype == "PCM_16"
        assert duration > 0.0

    # Ensure cleanup occurred after context exit
    assert not os.path.exists(temp_wav_recorded)


def test_empty_audio_rejection():
    service = AudioService()
    with pytest.raises(EmptyAudioError) as exc_info:
        with service.process_upload(b"", "empty.wav"):
            pass
    assert exc_info.value.code == "EMPTY_AUDIO_FILE"


def test_invalid_extension_rejection():
    service = AudioService()
    with pytest.raises(InvalidAudioFormatError) as exc_info:
        with service.process_upload(b"some fake data", "document.pdf"):
            pass
    assert exc_info.value.code == "INVALID_AUDIO_FORMAT"


def test_corrupted_audio_rejection():
    service = AudioService()
    fake_bytes = b"RIFF" + b"\x00" * 200 + b"NOT_VALID_AUDIO"
    with pytest.raises(CorruptedAudioError) as exc_info:
        with service.process_upload(fake_bytes, "corrupt.wav"):
            pass
    assert exc_info.value.code == "CORRUPTED_AUDIO_FILE"


def test_magic_bytes_detection():
    # Valid WAV container
    assert validate_audio_magic_bytes(b"RIFF\x24\x08\x00\x00WAVEfmt ", ".wav") is True
    # Fake WAV header
    assert validate_audio_magic_bytes(b"RIFF\x24\x08\x00\x00FAKEfmt ", ".wav") is False
    # Valid FLAC
    assert validate_audio_magic_bytes(b"fLaC\x00\x00\x00", ".flac") is True
    # Valid OGG
    assert validate_audio_magic_bytes(b"OggS\x00\x02", ".ogg") is True
    # Valid MP3 (ID3)
    assert validate_audio_magic_bytes(b"ID3\x04\x00\x00", ".mp3") is True
    # Random text disguised as audio
    assert validate_audio_magic_bytes(b"HELLO WORLD", ".wav") is False


def test_size_limit_rejection(monkeypatch):
    service = AudioService()
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)
    oversized_bytes = b"\x00" * 200

    with pytest.raises(AudioSizeLimitExceededError) as exc_info:
        with service.process_upload(oversized_bytes, "oversized.wav"):
            pass
    assert exc_info.value.code == "AUDIO_SIZE_LIMIT_EXCEEDED"


def test_duration_limit_rejection(monkeypatch, valid_audio_bytes):
    service = AudioService()
    monkeypatch.setattr(settings, "MAX_AUDIO_DURATION_SECONDS", 1.0)

    with pytest.raises(AudioDurationLimitExceededError) as exc_info:
        with service.process_upload(valid_audio_bytes, "long.wav"):
            pass
    assert exc_info.value.code == "AUDIO_DURATION_LIMIT_EXCEEDED"


def test_missing_ffmpeg_handling(valid_audio_bytes):
    service = AudioService(ffmpeg_bin="/non/existent/path/ffmpeg.exe")
    with pytest.raises(FFmpegNotFoundError) as exc_info:
        with service.process_upload(valid_audio_bytes, "test.wav"):
            pass
    assert exc_info.value.code == "FFMPEG_UNAVAILABLE"


def test_ffmpeg_subprocess_timeout(monkeypatch, valid_audio_bytes):
    service = AudioService()
    monkeypatch.setattr(service, "check_ffmpeg_available", lambda: True)

    def mock_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=["ffmpeg"], timeout=0.001)

    monkeypatch.setattr(subprocess, "run", mock_run)

    with pytest.raises(AudioNormalizationError) as exc_info:
        with service.process_upload(valid_audio_bytes, "timeout.wav"):
            pass
    assert "timed out" in str(exc_info.value)


def test_temp_cleanup_on_failure():
    service = AudioService()
    tracked_files_before = set(os.listdir(settings.AUDIO_TMP_DIR))

    with pytest.raises(CorruptedAudioError):
        with service.process_upload(b"garbage payload data", "bad.wav"):
            pass

    tracked_files_after = set(os.listdir(settings.AUDIO_TMP_DIR))
    assert tracked_files_before == tracked_files_after
