"""Unit Tests for Local Piper Text-to-Speech Service
Phase 6.5 - SDS Voice Intelligence
"""
import os
import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.config import settings
from app.services.piper_service import (
    PiperService,
    get_piper_service,
    TTSInvalidInputError,
    PiperNotFoundError,
    VoiceModelNotFoundError,
    TTSTimeoutError,
    TTSSynthesisError,
    validate_wav_header,
)


@pytest.fixture
def piper_service():
    """PiperService instance with configured project paths."""
    return PiperService()


# ==========================================
# 1. Real & Mocked Successful Synthesis Tests
# ==========================================

def test_real_piper_synthesis_if_available(piper_service):
    """Perform real synthesis using installed Piper binary and voice model."""
    if not piper_service.check_piper_available() or not piper_service.check_model_available():
        pytest.skip("Piper binary or voice model not available for live synthesis test.")

    test_text = "Welcome to SDS Voice Intelligence. Intelligent Calls. Smarter Connections."
    audio_bytes, duration = piper_service.synthesize(test_text, speed=1.0)

    assert isinstance(audio_bytes, bytes)
    assert len(audio_bytes) > 10000
    assert duration > 1.0
    assert audio_bytes[:4] == b"RIFF"
    assert audio_bytes[8:12] == b"WAVE"


def test_piper_version_query(piper_service):
    """Verify Piper version string is retrieved correctly."""
    if not piper_service.check_piper_available():
        pytest.skip("Piper binary not available.")

    version = piper_service.get_version()
    assert version.startswith("1.2")


def test_speed_parameter_clamping_and_length_scale(piper_service, monkeypatch):
    """Verify speed parameter is clamped between 0.5 and 2.0 and converted to length_scale."""
    captured_cmds = []

    def mock_run(cmd, *args, **kwargs):
        captured_cmds.append(cmd)
        # Create a dummy valid wav output at the requested path
        out_idx = cmd.index("-f") + 1
        out_file = Path(cmd[out_idx])
        # Write 1-second 22050Hz 16-bit mono wav dummy data
        header = b"RIFF\x24\xac\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x22\x56\x00\x00\x44\xac\x00\x00\x02\x00\x10\x00data\x00\xac\x00\x00" + b"\x00" * 44100
        with open(out_file, "wb") as fp:
            fp.write(header)
        res = MagicMock()
        res.returncode = 0
        return res

    monkeypatch.setattr(piper_service, "check_piper_available", lambda: True)
    monkeypatch.setattr(piper_service, "check_model_available", lambda: True)
    monkeypatch.setattr(subprocess, "run", mock_run)

    # Normal speed (1.0 -> length_scale 1.0)
    piper_service.synthesize("Hello world", speed=1.0)
    assert "--length_scale" in captured_cmds[0]
    assert captured_cmds[0][captured_cmds[0].index("--length_scale") + 1] == "1.0"

    # Fast speed (2.0 -> length_scale 0.5)
    piper_service.synthesize("Hello world", speed=2.0)
    assert captured_cmds[1][captured_cmds[1].index("--length_scale") + 1] == "0.5"

    # Out of bounds speed should clamp to 2.0 -> 0.5
    piper_service.synthesize("Hello world", speed=5.0)
    assert captured_cmds[2][captured_cmds[2].index("--length_scale") + 1] == "0.5"

    # Slow speed clamped to 0.5 -> 2.0
    piper_service.synthesize("Hello world", speed=0.1)
    assert captured_cmds[3][captured_cmds[3].index("--length_scale") + 1] == "2.0"


# ==========================================
# 2. Input Validation Tests
# ==========================================

def test_empty_text_rejection(piper_service):
    """Verify empty text raises TTSInvalidInputError."""
    with pytest.raises(TTSInvalidInputError) as exc_info:
        piper_service.synthesize("")
    assert exc_info.value.code == "INVALID_TTS_INPUT"


def test_whitespace_only_text_rejection(piper_service):
    """Verify whitespace-only string raises TTSInvalidInputError."""
    with pytest.raises(TTSInvalidInputError) as exc_info:
        piper_service.synthesize("     \n\t  ")
    assert exc_info.value.code == "INVALID_TTS_INPUT"


def test_excessively_long_text_rejection(piper_service, monkeypatch):
    """Verify text exceeding MAX_TTS_TEXT_LENGTH is rejected."""
    monkeypatch.setattr(settings, "MAX_TTS_TEXT_LENGTH", 50)
    long_text = "This text is definitely much longer than fifty characters in total."
    with pytest.raises(TTSInvalidInputError) as exc_info:
        piper_service.synthesize(long_text)
    assert exc_info.value.code == "INVALID_TTS_INPUT"
    assert "exceeds the maximum" in str(exc_info.value)


# ==========================================
# 3. Subsystem Availability & Error Handling Tests
# ==========================================

def test_piper_executable_missing_rejection():
    """Verify missing executable raises PiperNotFoundError."""
    service = PiperService(piper_bin="/non/existent/piper.exe")
    with pytest.raises(PiperNotFoundError) as exc_info:
        service.synthesize("Hello")
    assert exc_info.value.code == "PIPER_UNAVAILABLE"


def test_voice_model_missing_rejection(piper_service, monkeypatch):
    """Verify missing model file raises VoiceModelNotFoundError."""
    monkeypatch.setattr(piper_service, "check_piper_available", lambda: True)
    monkeypatch.setattr(piper_service, "model_path", "/non/existent/model.onnx")
    with pytest.raises(VoiceModelNotFoundError) as exc_info:
        piper_service.synthesize("Hello")
    assert exc_info.value.code == "VOICE_MODEL_NOT_FOUND"


def test_synthesis_timeout_handling(piper_service, monkeypatch):
    """Verify subprocess timeout raises TTSTimeoutError."""
    monkeypatch.setattr(piper_service, "check_piper_available", lambda: True)
    monkeypatch.setattr(piper_service, "check_model_available", lambda: True)

    def mock_timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=["piper"], timeout=0.001)

    monkeypatch.setattr(subprocess, "run", mock_timeout)

    with pytest.raises(TTSTimeoutError) as exc_info:
        piper_service.synthesize("Hello")
    assert exc_info.value.code == "TTS_TIMEOUT"
    assert "timed out" in str(exc_info.value)


def test_synthesis_non_zero_exit_handling(piper_service, monkeypatch):
    """Verify non-zero process exit code raises TTSSynthesisError."""
    monkeypatch.setattr(piper_service, "check_piper_available", lambda: True)
    monkeypatch.setattr(piper_service, "check_model_available", lambda: True)

    def mock_fail(*args, **kwargs):
        res = MagicMock()
        res.returncode = 1
        res.stderr = b"Internal error"
        return res

    monkeypatch.setattr(subprocess, "run", mock_fail)

    with pytest.raises(TTSSynthesisError) as exc_info:
        piper_service.synthesize("Hello")
    assert exc_info.value.code == "TTS_SYNTHESIS_FAILED"


def test_empty_or_corrupt_output_handling(piper_service, monkeypatch):
    """Verify empty or non-WAV output raises TTSSynthesisError."""
    monkeypatch.setattr(piper_service, "check_piper_available", lambda: True)
    monkeypatch.setattr(piper_service, "check_model_available", lambda: True)

    def mock_corrupt(cmd, *args, **kwargs):
        out_idx = cmd.index("-f") + 1
        out_file = Path(cmd[out_idx])
        with open(out_file, "wb") as fp:
            fp.write(b"NOT_A_VALID_WAV_HEADER_DATA_1234567890")
        res = MagicMock()
        res.returncode = 0
        return res

    monkeypatch.setattr(subprocess, "run", mock_corrupt)

    with pytest.raises(TTSSynthesisError) as exc_info:
        piper_service.synthesize("Hello")
    assert exc_info.value.code == "TTS_SYNTHESIS_FAILED"


# ==========================================
# 4. Cleanup & File Deletion Tests
# ==========================================

def test_temporary_file_cleanup_on_success(piper_service):
    """Verify temporary files are deleted after successful synthesis."""
    if not piper_service.check_piper_available() or not piper_service.check_model_available():
        pytest.skip("Piper not available.")

    files_before = set(os.listdir(settings.AUDIO_TMP_DIR))
    piper_service.synthesize("Testing cleanup after synthesis.")
    files_after = set(os.listdir(settings.AUDIO_TMP_DIR))

    assert files_before == files_after


def test_temporary_file_cleanup_on_failure(piper_service, monkeypatch):
    """Verify temporary files are cleaned up even if synthesis fails."""
    monkeypatch.setattr(piper_service, "check_piper_available", lambda: True)
    monkeypatch.setattr(piper_service, "check_model_available", lambda: True)

    def mock_crash(cmd, *args, **kwargs):
        out_idx = cmd.index("-f") + 1
        out_file = Path(cmd[out_idx])
        out_file.touch()  # Create empty file before crashing
        raise RuntimeError("Subprocess crashed")

    monkeypatch.setattr(subprocess, "run", mock_crash)

    files_before = set(os.listdir(settings.AUDIO_TMP_DIR))
    with pytest.raises(TTSSynthesisError):
        piper_service.synthesize("Hello")
    files_after = set(os.listdir(settings.AUDIO_TMP_DIR))

    assert files_before == files_after
