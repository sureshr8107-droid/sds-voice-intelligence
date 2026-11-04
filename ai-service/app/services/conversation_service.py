"""Conversation Orchestration Service
Phase 6.6 - SDS Voice Intelligence

Sequentially coordinates:
1. Audio normalization & validation (AudioService via FFmpeg)
2. Speech-to-Text transcription (WhisperService)
3. Intent classification & department routing (LLMService via Ollama)
4. Response safety validation & deterministic fallback
5. Text-to-Speech synthesis (PiperService via Piper standalone)

All processing is executed strictly sequentially with guaranteed temporary file
cleanup and comprehensive error shielding.
"""
import base64
import logging
import re
import threading
import time
from typing import Optional, Dict, Any

from app.config import settings
from app.schemas.conversation_schemas import ConversationPipelineResponse, AudioMetadata
from app.schemas.intent_schemas import IntentCategory
from app.services.audio_service import (
    AudioService,
    audio_service,
    EmptyAudioError,
    AudioProcessingError,
)
from app.services.whisper_service import (
    WhisperService,
    get_whisper_service,
    STTServiceError,
)
from app.services.llm_service import (
    LLMService,
    get_llm_service,
    LLMServiceError,
)
from app.services.piper_service import (
    PiperService,
    get_piper_service,
    TTSServiceError,
    TTSInvalidInputError,
)

logger = logging.getLogger(__name__)


# Transfer announcement patterns that must not be spoken without actual telephony transfer
_FALSE_TRANSFER_PATTERNS = [
    re.compile(r"you have been transferred", re.IGNORECASE),
    re.compile(r"i have transferred", re.IGNORECASE),
    re.compile(r"your call has been transferred", re.IGNORECASE),
    re.compile(r"transfer is complete", re.IGNORECASE),
    re.compile(r"transferred your call", re.IGNORECASE),
]


class ConversationService:
    """Modular service orchestrating full AI voice conversation pipeline."""

    _instance: Optional["ConversationService"] = None
    _instance_lock = threading.Lock()

    def __init__(
        self,
        audio_srv: Optional[AudioService] = None,
        whisper_srv: Optional[WhisperService] = None,
        llm_srv: Optional[LLMService] = None,
        piper_srv: Optional[PiperService] = None,
    ) -> None:
        self.audio_service = audio_srv or audio_service
        self.whisper_service = whisper_srv or get_whisper_service()
        self.llm_service = llm_srv or get_llm_service()
        self.piper_service = piper_srv or get_piper_service()

    @classmethod
    def get_instance(cls) -> "ConversationService":
        """Get or initialize singleton instance with double-checked locking."""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _sanitize_response_text(
        self,
        suggested_response: Optional[str],
        clarification_question: Optional[str],
        department: Optional[str],
    ) -> str:
        """Sanitize and validate caller-facing response text for safety and truthfulness.

        1. Replaces false transfer announcements with honest routing notices.
        2. Falls back to clarification questions when suggested response is missing.
        3. Enforces length boundaries to prevent TTS exhaustion.
        """
        raw_text = (suggested_response or "").strip()

        # If empty, fallback to clarification question or default prompt
        if not raw_text:
            if clarification_question and clarification_question.strip():
                raw_text = clarification_question.strip()
            else:
                raw_text = "I'm sorry, I didn't quite catch that. Could you please tell me how I can assist you?"

        # Prevent false claims that a transfer has completed
        dept_name = department or "the appropriate"
        for pattern in _FALSE_TRANSFER_PATTERNS:
            if pattern.search(raw_text):
                raw_text = pattern.sub(
                    f"I would be glad to connect your call to our {dept_name} department.",
                    raw_text,
                )

        # Enforce maximum text length boundary defensively
        max_len = settings.MAX_TTS_TEXT_LENGTH
        if len(raw_text) > max_len:
            truncated = raw_text[:max_len]
            # Try to truncate at sentence end
            last_period = max(truncated.rfind("."), truncated.rfind("?"), truncated.rfind("!"))
            if last_period > max_len // 2:
                raw_text = truncated[: last_period + 1]
            else:
                raw_text = truncated.rstrip() + "..."

        return raw_text

    def process_conversation(
        self,
        audio_bytes: bytes,
        original_filename: str,
        request_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> ConversationPipelineResponse:
        """Execute full conversational pipeline:

        1. Validate raw audio input bytes.
        2. Normalize audio to 16 kHz Mono WAV via FFmpeg inside context manager.
        3. Transcribe speech using faster-whisper.
        4. Classify intent via Ollama LLM (or apply silence fallback if no speech detected).
        5. Validate response text and sanitize safety boundaries.
        6. Synthesize WAV speech via Piper TTS.
        7. Encode audio to Base64 and return structured conversation payload.
        """
        t0 = time.perf_counter()
        req_id = request_id or "conv-req"

        if not audio_bytes or len(audio_bytes) == 0:
            raise EmptyAudioError("The uploaded audio file is empty (0 bytes).")

        # 1. & 2. Audio Validation & Normalization with guaranteed temp file cleanup
        with self.audio_service.process_upload(audio_bytes, original_filename) as (normalized_wav_path, input_duration):
            logger.info("Conversation pipeline audio normalized | req_id=%s | duration=%.2fs", req_id, input_duration)

            # 3. Speech-to-Text Transcription
            stt_result = self.whisper_service.transcribe(normalized_wav_path)
            transcript = (stt_result.get("transcript") or "").strip()
            logger.info("Conversation pipeline STT complete | req_id=%s | transcript_len=%d", req_id, len(transcript))

            # 4. Intent Classification (Sequential, never parallel with STT)
            if not transcript:
                logger.info("Empty transcript detected; applying silence clarification fallback | req_id=%s", req_id)
                intent = IntentCategory.UNKNOWN.value
                department = None
                confidence = 0.0
                urgency = "normal"
                summary = "No speech detected in audio."
                requires_clarification = True
                clarification_question = "Could you please repeat how I can help you today?"
                fallback_used = True
                response_text = "I'm sorry, I could not hear any speech. Could you please repeat how I can help you today?"
            else:
                try:
                    intent_result = self.llm_service.classify_intent(
                        transcription=transcript,
                        request_id=req_id,
                    )
                    intent = intent_result.intent
                    department = intent_result.department
                    confidence = intent_result.confidence
                    urgency = intent_result.urgency
                    summary = intent_result.summary
                    requires_clarification = intent_result.requires_clarification
                    clarification_question = intent_result.clarification_question
                    fallback_used = intent_result.fallback_used
                    response_text = self._sanitize_response_text(
                        suggested_response=intent_result.suggested_response,
                        clarification_question=clarification_question,
                        department=department,
                    )
                except LLMServiceError as lse:
                    logger.warning("LLM service error in conversation pipeline: %s. Using fallback.", str(lse))
                    intent = IntentCategory.UNKNOWN.value
                    department = None
                    confidence = 0.0
                    urgency = "normal"
                    summary = "Unable to determine caller intent."
                    requires_clarification = True
                    clarification_question = "Could you please tell me how I can assist you?"
                    fallback_used = True
                    response_text = "I'm sorry, I didn't quite catch that. Could you please tell me how I can assist you?"

            # 5. Text-to-Speech Synthesis (Sequential, never parallel with LLM)
            logger.info(
                "Conversation pipeline synthesizing response | req_id=%s | chars=%d | text='%s'",
                req_id,
                len(response_text),
                response_text[:60],
            )
            wav_bytes, tts_duration = self.piper_service.synthesize(
                text=response_text,
                speed=speed,
            )

            # 6. Encode Audio and Construct Metadata
            b64_audio = base64.b64encode(wav_bytes).decode("utf-8")
            audio_meta = AudioMetadata(
                format="wav",
                sample_rate=22050,
                channels=1,
                bit_depth=16,
                duration=round(tts_duration, 2),
                size_bytes=len(wav_bytes),
            )

            total_elapsed = time.perf_counter() - t0
            logger.info(
                "Conversation pipeline complete | req_id=%s | total_time=%.3fs | intent=%s | audio_bytes=%d",
                req_id,
                total_elapsed,
                intent,
                len(wav_bytes),
            )

            return ConversationPipelineResponse(
                success=True,
                request_id=req_id,
                transcript=transcript,
                intent=intent,
                department=department,
                confidence=round(confidence, 3),
                urgency=urgency,
                summary=summary,
                response_text=response_text,
                requires_clarification=requires_clarification,
                clarification_question=clarification_question,
                fallback_used=fallback_used,
                audio_metadata=audio_meta,
                audio=audio_meta,
                audio_base64=b64_audio,
                processing_time=round(total_elapsed, 3),
            )


# Singleton accessor
def get_conversation_service() -> ConversationService:
    return ConversationService.get_instance()

