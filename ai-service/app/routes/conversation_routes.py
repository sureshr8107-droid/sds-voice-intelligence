"""Conversation API Routes
Phase 6.6 - SDS Voice Intelligence
"""
import logging
import uuid
import time
from typing import Optional
from fastapi import APIRouter, Request, UploadFile, File, Form, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.conversation_schemas import ConversationPipelineResponse
from app.schemas.audio_schemas import ErrorResponse, ErrorDetail
from app.services.audio_service import (
    AudioProcessingError,
    AudioSizeLimitExceededError,
)
from app.services.whisper_service import STTServiceError
from app.services.piper_service import TTSServiceError
from app.services.conversation_service import get_conversation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/conversation", tags=["Conversation Pipeline"])
conversation_router = router


def _get_request_id(request: Request) -> str:
    """Extract or generate request correlation ID."""
    return getattr(request.state, "request_id", None) or str(uuid.uuid4().hex[:12])


@router.post(
    "/process-audio",
    response_model=ConversationPipelineResponse,
    responses={
        200: {
            "model": ConversationPipelineResponse,
            "description": "Successfully processed conversation turn with synthesized audio",
        },
        400: {"model": ErrorResponse, "description": "Invalid, empty, or unparseable audio file"},
        413: {"model": ErrorResponse, "description": "Audio file size exceeds limit"},
        500: {"model": ErrorResponse, "description": "Internal pipeline execution error"},
        503: {"model": ErrorResponse, "description": "Underlying AI subsystem unavailable (Whisper or Piper)"},
        504: {"model": ErrorResponse, "description": "Audio processing or synthesis timed out"},
    },
    summary="Process speech audio through full AI conversation pipeline",
    description=(
        "Processes caller audio end-to-end: normalizes to 16 kHz Mono WAV, "
        "transcribes with faster-whisper, classifies intent with Ollama LLM, "
        "synthesizes spoken response audio with Piper TTS, and returns base64 WAV."
    ),
)
async def process_conversation_audio(
    request: Request,
    file: UploadFile = File(..., description="Caller audio file to process"),
    speed: Optional[float] = Form(1.0, description="TTS playback speed (0.5 to 2.0, default 1.0)"),
):
    request_id = _get_request_id(request)
    filename = file.filename or "upload.wav"

    # Validate speed bounds if provided
    speed_val = 1.0 if speed is None else float(speed)
    if speed_val < settings.MIN_TTS_SPEED or speed_val > settings.MAX_TTS_SPEED:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INVALID_TTS_INPUT",
                    message=f"Speed must be between {settings.MIN_TTS_SPEED} and {settings.MAX_TTS_SPEED}.",
                ),
                request_id=request_id,
            ).model_dump(),
        )

    try:
        # Stream-read in bounded chunks to prevent unbounded memory allocation
        chunk_size = 1024 * 1024  # 1 MB chunks
        total_size = 0
        chunks = []

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
                raise AudioSizeLimitExceededError(
                    f"Audio file size exceeds the maximum limit of {max_mb:.1f} MB."
                )
            chunks.append(chunk)

        content = b"".join(chunks)

        conv_service = get_conversation_service()
        result = conv_service.process_conversation(
            audio_bytes=content,
            original_filename=filename,
            request_id=request_id,
            speed=speed_val,
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result.model_dump(),
            headers={
                "X-Audio-Duration": f"{result.audio_metadata.duration:.2f}s",
            },
        )

    except AudioProcessingError as ape:
        logger.error("Audio processing error in conversation pipeline: %s", str(ape))
        return JSONResponse(
            status_code=ape.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=ape.code, message=str(ape)),
                request_id=request_id,
            ).model_dump(),
        )
    except STTServiceError as sse:
        logger.error("STT service error in conversation pipeline: %s", str(sse))
        return JSONResponse(
            status_code=sse.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=sse.code, message=str(sse)),
                request_id=request_id,
            ).model_dump(),
        )
    except TTSServiceError as tse:
        logger.error("TTS service error in conversation pipeline: %s", str(tse))
        return JSONResponse(
            status_code=tse.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=tse.code, message=str(tse)),
                request_id=request_id,
            ).model_dump(),
        )
    except Exception as exc:
        logger.error("Unexpected error in conversation pipeline: %s", str(exc), exc_info=False)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected error occurred during conversation processing.",
                ),
                request_id=request_id,
            ).model_dump(),
        )

