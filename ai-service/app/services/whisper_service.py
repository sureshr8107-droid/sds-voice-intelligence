"""Whisper Speech-to-Text (STT) Service
Phase 6.3 - SDS Voice Intelligence

Provides thread-safe, lazy-loaded local CPU INT8 speech transcription
using faster-whisper. Strictly sequential inference execution to respect
hardware memory limits.
"""
import os
import threading
import time
from pathlib import Path
from typing import Dict, Any, Optional
from faster_whisper import WhisperModel

from app.config import settings


class STTServiceError(Exception):
    """Exception raised when speech recognition fails."""
    code = "STT_SERVICE_ERROR"
    status_code = 500

    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class WhisperService:
    """Singleton Speech-to-Text inference service using faster-whisper."""

    _instance: Optional["WhisperService"] = None
    _instance_lock = threading.Lock()

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
        cpu_threads: Optional[int] = None,
    ) -> None:
        self.model_name = model_name or settings.WHISPER_MODEL
        self.device = device or settings.WHISPER_DEVICE
        self.compute_type = compute_type or settings.WHISPER_COMPUTE_TYPE
        self.cpu_threads = cpu_threads or settings.WHISPER_CPU_THREADS

        self._model: Optional[WhisperModel] = None
        self._model_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "WhisperService":
        """Get or initialize the singleton service instance with double-checked locking."""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        """Check whether the model is currently resident in memory."""
        return self._model is not None

    def check_model_available(self) -> bool:
        """Check whether model weights exist in local HuggingFace cache without loading.

        Handles missing directories, permission errors, or custom HF_HOME gracefully.
        """
        try:
            if self.is_loaded:
                return True

            # Candidate cache roots
            candidates = []
            if os.getenv("HUGGINGFACE_HUB_CACHE"):
                candidates.append(Path(os.getenv("HUGGINGFACE_HUB_CACHE")))
            if os.getenv("HF_HOME"):
                candidates.append(Path(os.getenv("HF_HOME")) / "hub")
            candidates.append(Path.home() / ".cache" / "huggingface" / "hub")

            repo_folder_name = f"models--Systran--faster-whisper-{self.model_name}"

            for root in candidates:
                if not root.is_dir():
                    continue
                model_dir = root / repo_folder_name
                if model_dir.is_dir():
                    # Check snapshots folder for model binary
                    snapshots_dir = model_dir / "snapshots"
                    if snapshots_dir.is_dir():
                        for snap in snapshots_dir.iterdir():
                            if (snap / "model.bin").is_file():
                                return True
                    # Check blobs folder
                    blobs_dir = model_dir / "blobs"
                    if blobs_dir.is_dir() and any(blobs_dir.iterdir()):
                        return True
            return False
        except Exception:
            return False

    def load_model(self) -> WhisperModel:
        """Lazily initialize and cache the WhisperModel instance in a thread-safe manner."""
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    try:
                        self._model = WhisperModel(
                            self.model_name,
                            device=self.device,
                            compute_type=self.compute_type,
                            cpu_threads=self.cpu_threads,
                        )
                    except Exception as exc:
                        raise STTServiceError(
                            "Failed to initialize Whisper STT model instance."
                        ) from exc
        return self._model

    def transcribe(self, audio_file_path: str) -> Dict[str, Any]:
        """Transcribe a normalized audio WAV file to English text.

        Enforces thread locking to prevent concurrent CPU exhaustion.
        """
        if not os.path.isfile(audio_file_path):
            raise STTServiceError("Audio file provided for transcription does not exist.")

        model = self.load_model()

        # Enforce sequential execution lock to protect RAM & CPU allocation
        with self._model_lock:
            t0 = time.perf_counter()
            try:
                segments, info = model.transcribe(
                    audio_file_path,
                    beam_size=1,
                    language="en",
                    task="transcribe"
                )
                segment_list = list(segments)
            except Exception as exc:
                raise STTServiceError(
                    "Speech recognition inference failed during audio decoding."
                ) from exc
            t_infer = time.perf_counter() - t0

        transcript = " ".join(s.text.strip() for s in segment_list if s.text.strip())
        duration = float(getattr(info, "duration", 0.0))
        rtf = (t_infer / duration) if duration > 0 else 0.0

        return {
            "transcript": transcript,
            "detected_language": str(getattr(info, "language", "en")),
            "language_probability": round(float(getattr(info, "language_probability", 1.0)), 4),
            "duration": round(duration, 2),
            "processing_time": round(t_infer, 3),
            "real_time_factor": round(rtf, 3),
        }


# Singleton service instance accessor
def get_whisper_service() -> WhisperService:
    return WhisperService.get_instance()
