"""Text-to-Speech (TTS) API Routes
Phase 6.5 - SDS Voice Intelligence
"""
import logging
import uuid
import time
from typing import Optional
from fastapi import APIRouter, Request, status, Response
from fastapi.responses import JSONResponse

from app.schemas.tts_schemas import TTSSynthesizeRequest
from app.schemas.audio_schemas import ErrorResponse, ErrorDetail
from app.services.piper_service import (
    get_piper_service,
    TTSServiceError,
    TTSInvalidInputError,
    PiperNotFoundError,
    VoiceModelNotFoundError,
    TTSTimeoutError,
    TTSSynthesisError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tts", tags=["Text-to-Speech"])
tts_router = router


def _get_request_id(request: Request) -> str:
    """Extract or generate request correlation ID."""
    return getattr(request.state, "request_id", None) or str(uuid.uuid4().hex[:12])


@router.post(
    "/synthesize",
    responses={
        200: {
            "content": {"audio/wav": {}},
            "description": "Successfully synthesized WAV audio stream",
        },
        400: {"model": ErrorResponse, "description": "Invalid, empty, or excessively long text"},
        500: {"model": ErrorResponse, "description": "Audio synthesis failed"},
        503: {"model": ErrorResponse, "description": "Piper TTS subsystem unavailable"},
        504: {"model": ErrorResponse, "description": "Speech synthesis timed out"},
    },
    summary="Synthesize speech audio from text",
    description="Synthesizes validated English text into a 22,050 Hz Mono WAV audio stream using local Piper TTS.",
)
async def synthesize_speech(
    request: Request,
    payload: TTSSynthesizeRequest,
):
    request_id = _get_request_id(request)
    t0 = time.perf_counter()

    try:
        piper = get_piper_service()
        audio_bytes, duration = piper.synthesize(
            text=payload.text,
            speed=payload.speed or 1.0,
            voice=payload.voice or "en_US-lessac-medium",
        )

        elapsed = time.perf_counter() - t0
        file_id = uuid.uuid4().hex[:8]

        logger.info(
            "TTS synthesis request complete | req_id=%s | chars=%d | duration=%.2fs | time=%.3fs",
            request_id,
            len(payload.text),
            duration,
            elapsed,
        )

        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Type": "audio/wav",
                "Content-Disposition": f'inline; filename="tts_{file_id}.wav"',
                "X-Audio-Duration": f"{duration:.2f}s",
            },
        )

    except TTSServiceError as tse:
        logger.error("TTS service error: %s", str(tse))
        return JSONResponse(
            status_code=tse.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=tse.code, message=str(tse)),
                request_id=request_id,
            ).model_dump(),
        )
    except Exception as exc:
        logger.error("Unexpected error during speech synthesis: %s", str(exc), exc_info=False)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected error occurred during speech synthesis.",
                ),
                request_id=request_id,
            ).model_dump(),
        )
