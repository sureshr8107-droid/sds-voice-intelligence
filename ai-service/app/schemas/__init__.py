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
from app.schemas.intent_schemas import (
    IntentCategory,
    INTENT_DEPARTMENT_MAP,
    UrgencyLevel,
    IntentClassifyRequest,
    IntentClassifyResponse,
    LLMHealthInfo,
)

__all__ = [
    "TranscriptionData",
    "TranscriptionResponse",
    "ErrorDetail",
    "ErrorResponse",
    "HealthResponse",
    "STTHealthInfo",
    "FFmpegHealthInfo",
    "IntentCategory",
    "INTENT_DEPARTMENT_MAP",
    "UrgencyLevel",
    "IntentClassifyRequest",
    "IntentClassifyResponse",
    "LLMHealthInfo",
]
