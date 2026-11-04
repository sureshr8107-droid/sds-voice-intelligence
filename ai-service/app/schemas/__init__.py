"""AI Service Schemas Package."""
from app.schemas.audio_schemas import (
    TranscriptionData,
    TranscriptionResponse,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    STTHealthInfo,
    FFmpegHealthInfo,
)

__all__ = [
    "TranscriptionData",
    "TranscriptionResponse",
    "ErrorDetail",
    "ErrorResponse",
    "HealthResponse",
    "STTHealthInfo",
    "FFmpegHealthInfo",
]
