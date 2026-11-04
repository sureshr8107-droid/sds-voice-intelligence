"""Local Piper Text-to-Speech (TTS) Service
Phase 6.5 - SDS Voice Intelligence

Synthesizes English speech from text using local Piper standalone binary (v1.2.0)
and Lessac Medium voice model. Fully sandboxed, subprocess-safe, and self-cleaning.
"""
import os
import re
import uuid
import logging
import subprocess
import threading
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import soundfile as sf

from app.config import settings

logger = logging.getLogger(__name__)


class TTSServiceError(Exception):
    """Base exception for TTS service failures."""
    code = "TTS_SERVICE_ERROR"
    status_code = 500

    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class PiperNotFoundError(TTSServiceError):
    """Raised when Piper standalone executable cannot be found or executed."""
    code = "PIPER_UNAVAILABLE"
    status_code = 503


class VoiceModelNotFoundError(TTSServiceError):
    """Raised when voice model ONNX or JSON config is missing."""
    code = "VOICE_MODEL_NOT_FOUND"
    status_code = 503


class TTSTimeoutError(TTSServiceError):
    """Raised when audio synthesis exceeds configured timeout."""
    code = "TTS_TIMEOUT"
    status_code = 504


class TTSInvalidInputError(TTSServiceError):
    """Raised when synthesis text violates constraints."""
    code = "INVALID_TTS_INPUT"
    status_code = 400


class TTSSynthesisError(TTSServiceError):
    """Raised when Piper fails to generate valid WAV audio."""
    code = "TTS_SYNTHESIS_FAILED"
    status_code = 500


def validate_wav_header(file_path: Path) -> bool:
    """Validate that the generated file begins with standard RIFF/WAVE header markers."""
    try:
        with open(file_path, "rb") as fp:
            header = fp.read(12)
            return len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WAVE"
    except Exception:
        return False


class PiperService:
    """Modular local Text-to-Speech service using Piper standalone binary."""

    _instance: Optional["PiperService"] = None
    _instance_lock = threading.Lock()

    def __init__(
        self,
        piper_bin: Optional[str] = None,
        model_path: Optional[str] = None,
        config_path: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.piper_bin = piper_bin or settings.PIPER_EXECUTABLE_PATH
        self.model_path = model_path or settings.PIPER_MODEL_PATH
        self.config_path = config_path or settings.PIPER_CONFIG_PATH
        self.timeout = timeout or settings.PIPER_TIMEOUT_SECONDS
        self._lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "PiperService":
        """Get or initialize singleton instance with double-checked locking."""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def check_piper_available(self) -> bool:
        """Verify that Piper executable exists and responds to version query."""
        if not self.piper_bin or not os.path.isfile(self.piper_bin):
            return False
        try:
            res = subprocess.run(
                [self.piper_bin, "--version"],
                capture_output=True,
                text=True,
                timeout=5.0,
            )
            return res.returncode == 0
        except Exception:
            return False

    def get_version(self) -> str:
        """Query Piper executable for its semantic version string."""
        if not self.check_piper_available():
            return "unavailable"
        try:
            res = subprocess.run(
                [self.piper_bin, "--version"],
                capture_output=True,
                text=True,
                timeout=3.0,
            )
            return res.stdout.strip() or "1.2.0"
        except Exception:
            return "unknown"

    def check_model_available(self) -> bool:
        """Verify that the ONNX model file and JSON config exist."""
        if not self.model_path or not os.path.isfile(self.model_path):
            return False
        if not self.config_path or not os.path.isfile(self.config_path):
            return False
        return True

    def synthesize(
        self,
        text: str,
        speed: float = 1.0,
        voice: Optional[str] = None,
    ) -> Tuple[bytes, float]:
        """Synthesize text into speech WAV bytes with duration.

        1. Validates text input length and non-emptiness.
        2. Validates Piper executable and voice model presence.
        3. Formulates safe, fixed argument list without shell=True.
        4. Transmits text over standard input pipe.
        5. Enforces subprocess timeout and verifies exit code.
        6. Validates output WAV header and non-empty size.
        7. Reads audio duration and raw bytes.
        8. Guarantees temporary output file deletion in finally block.
        """
        clean_text = text.strip() if text else ""
        if not clean_text:
            raise TTSInvalidInputError("Text to synthesize cannot be empty or whitespace only.")

        if len(clean_text) > settings.MAX_TTS_TEXT_LENGTH:
            raise TTSInvalidInputError(
                f"Text length ({len(clean_text)}) exceeds the maximum allowed limit of {settings.MAX_TTS_TEXT_LENGTH} characters."
            )

        # Validate speed bounds
        clamped_speed = max(settings.MIN_TTS_SPEED, min(settings.MAX_TTS_SPEED, float(speed)))
        # Piper length_scale is inversely proportional to playback speed (1.0 = normal, 0.8 = faster)
        length_scale = round(1.0 / clamped_speed, 3)

        if not self.check_piper_available():
            raise PiperNotFoundError(
                "Text-to-Speech subsystem is unavailable. Please verify Piper installation."
            )

        if not self.check_model_available():
            raise VoiceModelNotFoundError(
                "Voice model weights or configuration file is missing from tools directory."
            )

        file_id = uuid.uuid4().hex
        temp_output_path = settings.AUDIO_TMP_DIR / f"tts_{file_id}.wav"

        # Fixed, safe command arguments list
        cmd = [
            self.piper_bin,
            "-m", str(self.model_path),
            "-c", str(self.config_path),
            "-f", str(temp_output_path),
            "--length_scale", str(length_scale),
        ]

        try:
            with self._lock:
                t0 = time.perf_counter()
                try:
                    res = subprocess.run(
                        cmd,
                        input=clean_text.encode("utf-8"),
                        capture_output=True,
                        timeout=self.timeout,
                    )
                except subprocess.TimeoutExpired as exc:
                    raise TTSTimeoutError(
                        f"Speech synthesis timed out after {self.timeout}s."
                    ) from exc
                except Exception as exc:
                    raise TTSSynthesisError(
                        "Failed to execute speech synthesis process."
                    ) from exc

                if res.returncode != 0:
                    err_msg = res.stderr.decode("utf-8", errors="replace").strip() if res.stderr else "Unknown error"
                    logger.error("Piper process failed with exit code %d: %s", res.returncode, err_msg)
                    raise TTSSynthesisError(
                        "Speech synthesis process returned a non-zero exit code."
                    )

                if not temp_output_path.is_file() or temp_output_path.stat().st_size <= 44:
                    raise TTSSynthesisError("Speech synthesis produced an empty or truncated audio file.")

                if not validate_wav_header(temp_output_path):
                    raise TTSSynthesisError("Speech synthesis produced an invalid WAV header.")

                # Read audio duration
                try:
                    info = sf.info(str(temp_output_path))
                    duration = float(info.duration)
                except Exception as exc:
                    raise TTSSynthesisError("Failed to decode synthesized WAV audio properties.") from exc

                # Read output bytes into memory
                with open(temp_output_path, "rb") as fp:
                    audio_bytes = fp.read()

                t_total = time.perf_counter() - t0
                rtf = (t_total / duration) if duration > 0 else 0.0
                logger.info(
                    "TTS synthesis successful | length=%d chars | duration=%.2fs | infer=%.3fs | RTF=%.3f",
                    len(clean_text),
                    duration,
                    t_total,
                    rtf,
                )

                return audio_bytes, duration

        finally:
            # Guaranteed cleanup of temporary output file
            if temp_output_path.exists():
                try:
                    temp_output_path.unlink()
                except Exception:
                    pass


# Singleton accessor
def get_piper_service() -> PiperService:
    return PiperService.get_instance()
