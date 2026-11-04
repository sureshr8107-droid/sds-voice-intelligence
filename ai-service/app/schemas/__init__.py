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
from app.schemas.tts_schemas import (
    TTSSynthesizeRequest,
    TTSHealthInfo,
)
from app.schemas.conversation_schemas import (
    AudioMetadata,
    ConversationPipelineResponse,
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
    "TTSSynthesizeRequest",
    "TTSHealthInfo",
    "AudioMetadata",
    "ConversationPipelineResponse",
]
