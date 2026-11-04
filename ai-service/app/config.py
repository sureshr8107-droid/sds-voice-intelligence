"""SDS Voice Intelligence - AI Service Configuration
Phase 6.3 - Audio Processing & STT Service
"""
import os
import shutil
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Base Directory Resolution
BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = BASE_DIR.parent

# Load local .env file if it exists
_env_path = BASE_DIR / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


def _resolve_ffmpeg_path() -> str:
    """Resolve FFmpeg binary location safely across workspace and system PATH."""
    env_path = os.getenv("FFMPEG_EXECUTABLE_PATH")
    if env_path and Path(env_path).is_file():
        return str(Path(env_path).resolve())

    # Check known project relative paths
    candidates = [
        BASE_DIR.parent / "tools" / "ffmpeg" / "bin" / "ffmpeg.exe",
        BASE_DIR / "tools" / "ffmpeg" / "bin" / "ffmpeg.exe",
        WORKSPACE_ROOT / "tools" / "ffmpeg" / "bin" / "ffmpeg.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate.resolve())

    # Fallback to system PATH
    which_path = shutil.which("ffmpeg")
    if which_path:
        return str(Path(which_path).resolve())

    # Return default relative path if not yet found (will be checked at runtime)
    return str(candidates[0])


class Settings:
    """Validated runtime configuration for the SDS Voice Intelligence AI Service."""

    def __init__(self) -> None:
        self.HOST: str = os.getenv("HOST", "127.0.0.1")
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

        # FFmpeg Configuration
        self.FFMPEG_EXECUTABLE_PATH: str = _resolve_ffmpeg_path()

        # faster-whisper STT Configuration
        self.WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base.en")
        self.WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
        self.WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        self.WHISPER_CPU_THREADS: int = int(os.getenv("WHISPER_CPU_THREADS", "4"))

        # Audio Upload and Processing Limits
        # Default: 25 MB max upload size
        self.MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(25 * 1024 * 1024)))
        # Default: 120 seconds max audio duration
        self.MAX_AUDIO_DURATION_SECONDS: float = float(os.getenv("MAX_AUDIO_DURATION_SECONDS", "120.0"))
        # Default: 30 seconds processing timeout
        self.AUDIO_PROCESSING_TIMEOUT_SECONDS: float = float(
            os.getenv("AUDIO_PROCESSING_TIMEOUT_SECONDS", "30.0")
        )

        # Temporary Audio Storage
        default_tmp_dir = BASE_DIR / "tmp" / "audio"
        self.AUDIO_TMP_DIR: Path = Path(os.getenv("AUDIO_TMP_DIR", str(default_tmp_dir))).resolve()
        self.AUDIO_TMP_DIR.mkdir(parents=True, exist_ok=True)

        # Supported Audio File Extensions
        self.ALLOWED_AUDIO_EXTENSIONS: List[str] = [
            ".wav",
            ".mp3",
            ".ogg",
            ".flac",
            ".m4a",
            ".aac",
            ".webm",
            ".wma",
        ]

        # Ollama LLM Configuration (Phase 6.4)
        self.OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        self.OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
        self.OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "15.0"))
        self.OLLAMA_TEMPERATURE: float = float(os.getenv("OLLAMA_TEMPERATURE", "0.1"))
        self.MAX_TRANSCRIPTION_LENGTH: int = int(os.getenv("MAX_TRANSCRIPTION_LENGTH", "2000"))
        self.INTENT_MAX_CONCURRENT_REQUESTS: int = int(os.getenv("INTENT_MAX_CONCURRENT_REQUESTS", "2"))
        self.INTENT_CONFIDENCE_THRESHOLD: float = float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", "0.6"))


# Singleton settings instance
settings = Settings()
