"""Unit Tests for Conversation Orchestration Service
Phase 6.6 - SDS Voice Intelligence
"""
import base64
import io
import os
import pytest
import soundfile as sf
from unittest.mock import MagicMock, patch

from app.config import settings
from app.schemas.conversation_schemas import ConversationPipelineResponse
from app.schemas.intent_schemas import IntentClassifyResponse, IntentCategory
from app.services.audio_service import (
    AudioService,
    EmptyAudioError,
    CorruptedAudioError,
)
from app.services.whisper_service import WhisperService, STTServiceError
from app.services.llm_service import LLMService, LLMServiceError
from app.services.piper_service import (
    PiperService,
    TTSServiceError,
    PiperNotFoundError,
    TTSSynthesisError,
)
from app.services.conversation_service import (
    ConversationService,
    get_conversation_service,
)

# Standard 1-second 22,050 Hz 16-bit mono dummy WAV bytes
DUMMY_SYNTHESIZED_WAV = (
    b"RIFF\x24\xac\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x22\x56\x00\x00\x44\xac\x00\x00\x02\x00\x10\x00data\x00\xac\x00\x00"
    + b"\x00" * 44100
)

# 1-second 16,000 Hz 16-bit mono valid input WAV dummy bytes
DUMMY_INPUT_WAV = (
    b"RIFF\x24\x7d\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00}\x00\x00"
    + b"\x00" * 32000
)


@pytest.fixture
def mock_whisper():
    mock = MagicMock(spec=WhisperService)
    mock.transcribe.return_value = {
        "transcript": "Hello, I have an issue with my bill for invoice 1234.",
        "detected_language": "en",
        "language_probability": 0.99,
        "duration": 3.5,
        "processing_time": 0.45,
        "real_time_factor": 0.128,
    }
    return mock


@pytest.fixture
def mock_llm():
    mock = MagicMock(spec=LLMService)
    mock.classify_intent.return_value = IntentClassifyResponse(
        success=True,
        intent="billing_enquiry",
        department="Billing",
        confidence=0.95,
        urgency="normal",
        summary="Caller has an issue with invoice 1234.",
        extracted_entities={"invoice": "1234"},
        suggested_response="I would be happy to connect you with our Billing department to review invoice 1234.",
        requires_clarification=False,
        clarification_question=None,
        fallback_used=False,
        request_id="test-req-001",
        processing_time=0.35,
    )
    return mock


@pytest.fixture
def mock_piper():
    mock = MagicMock(spec=PiperService)
    mock.synthesize.return_value = (DUMMY_SYNTHESIZED_WAV, 1.0)
    return mock


@pytest.fixture
def conversation_service(mock_whisper, mock_llm, mock_piper):
    return ConversationService(
        whisper_srv=mock_whisper,
        llm_srv=mock_llm,
        piper_srv=mock_piper,
    )


# ==========================================
# 1. Pipeline Execution Flow Tests
# ==========================================

def test_successful_pipeline_flow(conversation_service, mock_whisper, mock_llm, mock_piper):
    """Verify complete end-to-end execution of the conversation pipeline."""
    result = conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="call.wav",
        request_id="test-call-123",
        speed=1.0,
    )

    assert isinstance(result, ConversationPipelineResponse)
    assert result.success is True
    assert result.request_id == "test-call-123"
    assert "invoice 1234" in result.transcript
    assert result.intent == "billing_enquiry"
    assert result.department == "Billing"
    assert result.confidence == 0.95
    assert result.urgency == "normal"
    assert "Billing department" in result.response_text
    assert result.requires_clarification is False
    assert result.fallback_used is False

    # Audio metadata validation
    assert result.audio_metadata.format == "wav"
    assert result.audio_metadata.sample_rate == 22050
    assert result.audio_metadata.channels == 1
    assert result.audio_metadata.duration == 1.0
    assert result.audio_metadata.size_bytes == len(DUMMY_SYNTHESIZED_WAV)

    # Base64 audio validation
    decoded = base64.b64decode(result.audio_base64)
    assert decoded[:4] == b"RIFF"
    assert decoded[8:12] == b"WAVE"

    # Verify component invocations
    mock_whisper.transcribe.assert_called_once()
    mock_llm.classify_intent.assert_called_once_with(
        transcription="Hello, I have an issue with my bill for invoice 1234.",
        request_id="test-call-123",
    )
    mock_piper.synthesize.assert_called_once()


def test_empty_audio_upload_rejection(conversation_service):
    """Verify empty audio bytes raise EmptyAudioError immediately."""
    with pytest.raises(EmptyAudioError):
        conversation_service.process_conversation(
            audio_bytes=b"",
            original_filename="empty.wav",
        )


def test_empty_transcript_silence_fallback(conversation_service, mock_whisper, mock_llm, mock_piper):
    """Verify empty speech transcript triggers silence fallback without invoking LLM."""
    mock_whisper.transcribe.return_value = {"transcript": ""}

    result = conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="silence.wav",
        request_id="test-silence-001",
    )

    assert result.success is True
    assert result.transcript == ""
    assert result.intent == IntentCategory.UNKNOWN.value
    assert result.department is None
    assert result.confidence == 0.0
    assert result.requires_clarification is True
    assert result.fallback_used is True
    assert "could not hear any speech" in result.response_text.lower()

    # LLM should not be called on empty transcript
    mock_llm.classify_intent.assert_not_called()

    # Piper should synthesize the clarification prompt
    mock_piper.synthesize.assert_called_once()


def test_whitespace_only_transcript_fallback(conversation_service, mock_whisper, mock_llm, mock_piper):
    """Verify whitespace-only transcript is treated as silent audio."""
    mock_whisper.transcribe.return_value = {"transcript": "   \n\t  "}

    result = conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="blank.wav",
    )

    assert result.intent == IntentCategory.UNKNOWN.value
    assert result.fallback_used is True
    mock_llm.classify_intent.assert_not_called()


def test_llm_service_error_graceful_fallback(conversation_service, mock_whisper, mock_llm, mock_piper):
    """Verify LLM service failure gracefully falls back to deterministic prompt and still produces speech."""
    mock_llm.classify_intent.side_effect = LLMServiceError("Ollama connection failed")

    result = conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="call.wav",
        request_id="test-llm-fail",
    )

    assert result.success is True
    assert result.intent == IntentCategory.UNKNOWN.value
    assert result.fallback_used is True
    assert result.requires_clarification is True
    assert "didn't quite catch that" in result.response_text
    mock_piper.synthesize.assert_called_once()


# ==========================================
# 2. Safety & Sanitization Tests
# ==========================================

def test_false_transfer_announcement_sanitization(conversation_service, mock_whisper, mock_llm):
    """Verify statements claiming a call transfer has finished are sanitized to honest routing notices."""
    mock_llm.classify_intent.return_value.suggested_response = (
        "Your call has been transferred to Billing. Goodbye."
    )

    result = conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="call.wav",
    )

    assert "Your call has been transferred" not in result.response_text
    assert "connect your call to our Billing department" in result.response_text


def test_excessively_long_response_text_truncation(conversation_service, mock_whisper, mock_llm):
    """Verify response text exceeding MAX_TTS_TEXT_LENGTH is truncated gracefully."""
    long_response = "This is a detailed explanation of customer service policies. " * 30  # >1800 chars
    mock_llm.classify_intent.return_value.suggested_response = long_response

    result = conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="call.wav",
    )

    assert len(result.response_text) <= settings.MAX_TTS_TEXT_LENGTH


# ==========================================
# 3. Component Failure & Cleanup Tests
# ==========================================

def test_stt_failure_propagates(conversation_service, mock_whisper):
    """Verify Whisper failure raises STTServiceError."""
    mock_whisper.transcribe.side_effect = STTServiceError("Whisper decode failed")

    with pytest.raises(STTServiceError):
        conversation_service.process_conversation(
            audio_bytes=DUMMY_INPUT_WAV,
            original_filename="call.wav",
        )


def test_tts_failure_propagates(conversation_service, mock_piper):
    """Verify Piper synthesis failure raises TTSServiceError."""
    mock_piper.synthesize.side_effect = TTSSynthesisError("Piper process crashed")

    with pytest.raises(TTSServiceError):
        conversation_service.process_conversation(
            audio_bytes=DUMMY_INPUT_WAV,
            original_filename="call.wav",
        )


def test_temporary_files_cleaned_up_on_success(conversation_service):
    """Verify no orphaned files in AUDIO_TMP_DIR after successful execution."""
    files_before = set(os.listdir(settings.AUDIO_TMP_DIR))
    conversation_service.process_conversation(
        audio_bytes=DUMMY_INPUT_WAV,
        original_filename="cleanup_test.wav",
    )
    files_after = set(os.listdir(settings.AUDIO_TMP_DIR))

    assert files_before == files_after


def test_temporary_files_cleaned_up_on_failure(conversation_service, mock_whisper):
    """Verify temporary files are cleaned up even when downstream processing fails."""
    mock_whisper.transcribe.side_effect = RuntimeError("Crash during inference")

    files_before = set(os.listdir(settings.AUDIO_TMP_DIR))
    with pytest.raises(RuntimeError):
        conversation_service.process_conversation(
            audio_bytes=DUMMY_INPUT_WAV,
            original_filename="crash_test.wav",
        )
    files_after = set(os.listdir(settings.AUDIO_TMP_DIR))

    assert files_before == files_after


def test_singleton_accessor():
    """Verify get_conversation_service returns singleton instance."""
    s1 = get_conversation_service()
    s2 = get_conversation_service()
    assert s1 is s2

