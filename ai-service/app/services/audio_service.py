"""Audio Processing Service
Phase 6.3 - SDS Voice Intelligence

Handles audio upload validation, format normalization to telephony-standard
16,000 Hz Mono 16-bit PCM WAV via FFmpeg, safe temporary file isolation,
and rigorous resource cleanup.
"""
import os
import re
import subprocess
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Tuple, Optional
import soundfile as sf

from app.config import settings


class AudioProcessingError(Exception):
    """Base exception for all audio processing failures."""
    code = "AUDIO_PROCESSING_ERROR"
    status_code = 500

    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class EmptyAudioError(AudioProcessingError):
    code = "EMPTY_AUDIO_FILE"
    status_code = 400


class InvalidAudioFormatError(AudioProcessingError):
    code = "INVALID_AUDIO_FORMAT"
    status_code = 400


class CorruptedAudioError(AudioProcessingError):
    code = "CORRUPTED_AUDIO_FILE"
    status_code = 400


class AudioSizeLimitExceededError(AudioProcessingError):
    code = "AUDIO_SIZE_LIMIT_EXCEEDED"
    status_code = 413


class AudioDurationLimitExceededError(AudioProcessingError):
    code = "AUDIO_DURATION_LIMIT_EXCEEDED"
    status_code = 400


class FFmpegNotFoundError(AudioProcessingError):
    code = "FFMPEG_UNAVAILABLE"
    status_code = 503


class AudioNormalizationError(AudioProcessingError):
    code = "AUDIO_NORMALIZATION_FAILED"
    status_code = 500


def validate_audio_magic_bytes(header_bytes: bytes, ext: str) -> bool:
    """Inspect leading magic bytes to detect non-audio payloads upfront."""
    if len(header_bytes) < 4:
        return False

    ext_lower = ext.lower()

    # WAV container: RIFF....WAVE
    if ext_lower == ".wav":
        return header_bytes.startswith(b"RIFF") and b"WAVE" in header_bytes[:16]

    # OGG container: OggS
    if ext_lower == ".ogg":
        return header_bytes.startswith(b"OggS")

    # FLAC stream: fLaC
    if ext_lower == ".flac":
        return header_bytes.startswith(b"fLaC")

    # MP3: ID3v2 tag or MPEG audio sync word (11 bits set: 0xFF, 0xEx)
    if ext_lower == ".mp3":
        if header_bytes.startswith(b"ID3"):
            return True
        if header_bytes[0] == 0xFF and (header_bytes[1] & 0xE0) == 0xE0:
            return True
        return False

    # M4A / AAC container: ftyp atom or ADTS sync word (0xFF, 0xFx)
    if ext_lower in (".m4a", ".aac"):
        if b"ftyp" in header_bytes[:16]:
            return True
        if header_bytes[0] == 0xFF and (header_bytes[1] & 0xF0) == 0xF0:
            return True
        return False

    # WEBM container: EBML header ID
    if ext_lower == ".webm":
        return header_bytes.startswith(b"\x1a\x45\xdf\xa3")

    # WMA / ASF container
    if ext_lower == ".wma":
        return header_bytes.startswith(b"\x30\x26\xb2\x75")

    # Fallback for extensions in allowed list
    return ext_lower in settings.ALLOWED_AUDIO_EXTENSIONS


class AudioService:
    """Modular audio processing and normalization service."""

    def __init__(self, ffmpeg_bin: Optional[str] = None) -> None:
        self.ffmpeg_bin = ffmpeg_bin or settings.FFMPEG_EXECUTABLE_PATH

    def check_ffmpeg_available(self) -> bool:
        """Verify that the FFmpeg executable is present and operational."""
        if not self.ffmpeg_bin or not os.path.isfile(self.ffmpeg_bin):
            return False
        try:
            res = subprocess.run(
                [self.ffmpeg_bin, "-version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return res.returncode == 0
        except Exception:
            return False

    def validate_metadata(self, filename: str, file_size: int, leading_bytes: Optional[bytes] = None) -> None:
        """Validate filename extension, raw byte size, and media header before full processing."""
        if not filename:
            raise InvalidAudioFormatError("Filename was not provided.")

        ext = Path(filename).suffix.lower()

        # Strict extension validation: alphanumeric only, no path traversal characters
        if not re.match(r"^\.[a-z0-9]{1,8}$", ext) or ext not in settings.ALLOWED_AUDIO_EXTENSIONS:
            allowed = ", ".join(settings.ALLOWED_AUDIO_EXTENSIONS)
            raise InvalidAudioFormatError(
                f"Unsupported audio format '{ext}'. Supported formats: {allowed}"
            )

        if file_size <= 0:
            raise EmptyAudioError("The uploaded audio file is empty (0 bytes).")

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise AudioSizeLimitExceededError(
                f"Audio file size exceeds the maximum limit of {max_mb:.1f} MB."
            )

        # Inspect leading magic bytes if available
        if leading_bytes is not None and len(leading_bytes) >= 4:
            if not validate_audio_magic_bytes(leading_bytes, ext):
                raise CorruptedAudioError(
                    f"The uploaded file header does not match a valid audio format for '{ext}'."
                )

    def normalize_to_wav(self, input_path: str, output_path: str) -> None:
        """Transcode source audio to 16,000 Hz, 1-channel, signed 16-bit PCM WAV using FFmpeg."""
        if not self.check_ffmpeg_available():
            raise FFmpegNotFoundError(
                "Audio conversion subsystem is unavailable. Please verify FFmpeg installation."
            )

        # Build safe, fixed argument list (never shell=True, user input never concatenated)
        cmd = [
            self.ffmpeg_bin,
            "-y",
            "-v", "error",
            "-i", str(input_path),
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            "-f", "wav",
            str(output_path)
        ]

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.AUDIO_PROCESSING_TIMEOUT_SECONDS
            )
        except subprocess.TimeoutExpired:
            raise AudioNormalizationError(
                f"Audio normalization timed out after {settings.AUDIO_PROCESSING_TIMEOUT_SECONDS}s."
            )
        except Exception as exc:
            raise AudioNormalizationError(
                "Failed to execute audio normalization process."
            ) from exc

        if res.returncode != 0:
            err_msg = res.stderr.lower() if res.stderr else ""
            if "invalid data found" in err_msg or "error opening input" in err_msg:
                raise CorruptedAudioError(
                    "The uploaded file is not a valid audio stream or has corrupted headers."
                )
            raise AudioNormalizationError("Audio normalization failed during transcoding.")

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise AudioNormalizationError("Audio normalization generated an empty output file.")

    @contextmanager
    def process_upload(
        self,
        file_bytes: bytes,
        original_filename: str
    ) -> Generator[Tuple[str, float], None, None]:
        """Context manager for full audio lifecycle:

        1. Validates size, extension, and magic bytes
        2. Safely writes raw upload to isolated temporary file
        3. Normalizes via FFmpeg to 16 kHz Mono PCM WAV
        4. Validates decoded duration against limit
        5. Yields (normalized_wav_path, duration)
        6. Guarantees removal of all created temporary files in finally block
        """
        self.validate_metadata(original_filename, len(file_bytes), file_bytes[:32])

        # Generate unique temporary file names inside configured temp directory
        file_id = uuid.uuid4().hex
        ext = Path(original_filename).suffix.lower()
        # Strictly sanitize extension
        safe_ext = re.sub(r"[^a-z0-9.]", "", ext)
        input_temp_path = settings.AUDIO_TMP_DIR / f"upload_{file_id}{safe_ext}"
        normalized_temp_path = settings.AUDIO_TMP_DIR / f"norm_{file_id}.wav"

        created_files = []

        try:
            # Write uploaded content
            with open(input_temp_path, "wb") as fp:
                fp.write(file_bytes)
            created_files.append(input_temp_path)

            # Perform FFmpeg normalization
            self.normalize_to_wav(str(input_temp_path), str(normalized_temp_path))
            created_files.append(normalized_temp_path)

            # Read normalized audio properties and validate duration
            try:
                info = sf.info(str(normalized_temp_path))
                duration = float(info.duration)
            except Exception as exc:
                raise CorruptedAudioError(
                    "Decoded audio header is invalid or unreadable."
                ) from exc

            if duration <= 0:
                raise CorruptedAudioError("Decoded audio contains no playable samples.")

            if duration > settings.MAX_AUDIO_DURATION_SECONDS:
                raise AudioDurationLimitExceededError(
                    f"Audio duration ({duration:.1f}s) exceeds the maximum allowed limit of "
                    f"{settings.MAX_AUDIO_DURATION_SECONDS:.1f}s."
                )

            # Yield normalized WAV path and duration to caller
            yield str(normalized_temp_path), duration

        finally:
            # Guaranteed cleanup of all created temporary files
            for file_path in created_files:
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass


# Singleton service instance
audio_service = AudioService()
