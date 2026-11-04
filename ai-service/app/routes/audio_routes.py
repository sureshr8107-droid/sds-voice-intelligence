"""Audio and Speech-to-Text API Routes
Phase 6.3 - SDS Voice Intelligence
"""
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Request, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.audio_schemas import (
    TranscriptionResponse,
    HealthResponse,
    STTHealthInfo,
    FFmpegHealthInfo,
    ErrorResponse,
    ErrorDetail,
)
from app.services.audio_service import (
    audio_service,
    AudioProcessingError,
    AudioSizeLimitExceededError,
)
from app.services.whisper_service import (
    get_whisper_service,
    STTServiceError,
)

router = APIRouter(prefix="/api/v1/audio", tags=["Audio & STT"])
audio_router = router
health_router = APIRouter(tags=["Health"])


def _get_request_id(request: Request) -> str:
    """Extract or generate request correlation ID."""
    return getattr(request.state, "request_id", None) or str(uuid.uuid4().hex[:12])


def _sanitize_path(file_path: str) -> str:
    """Sanitize path for public API exposure (never leak user profile/absolute paths)."""
    p = Path(file_path)
    parts = p.parts
    if "tools" in parts:
        idx = parts.index("tools")
        return "/".join(parts[idx:])
    return p.name


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid, corrupt or excessively long audio"},
        413: {"model": ErrorResponse, "description": "Audio file size exceeds limit"},
        500: {"model": ErrorResponse, "description": "Audio normalization or transcription error"},
        503: {"model": ErrorResponse, "description": "Audio processing subsystem unavailable"},
    },
    summary="Transcribe audio to English text",
    description="Accepts an uploaded audio file (WAV, MP3, OGG, FLAC, M4A, etc.), "
                "normalizes to 16 kHz Mono PCM WAV via FFmpeg, and transcribes using faster-whisper.",
)
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(..., description="Audio file to transcribe")
):
    request_id = _get_request_id(request)
    filename = file.filename or "upload.wav"

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

        # Lifecycle-managed audio normalization and cleanup
        with audio_service.process_upload(content, filename) as (normalized_wav_path, duration):
            whisper = get_whisper_service()
            result = whisper.transcribe(normalized_wav_path)

            return TranscriptionResponse(
                success=True,
                transcript=result["transcript"],
                detected_language=result["detected_language"],
                language_probability=result["language_probability"],
                duration=result["duration"],
                processing_time=result["processing_time"],
                real_time_factor=result["real_time_factor"],
                request_id=request_id,
            )

    except AudioProcessingError as ape:
        return JSONResponse(
            status_code=ape.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=ape.code, message=str(ape)),
                request_id=request_id,
            ).model_dump(),
        )
    except STTServiceError as sse:
        return JSONResponse(
            status_code=sse.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=sse.code, message=str(sse)),
                request_id=request_id,
            ).model_dump(),
        )
    except Exception:
        # Safe fallback: never expose raw stack traces or internal paths
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected error occurred during audio processing."
                ),
                request_id=request_id,
            ).model_dump(),
        )


@health_router.get(
    "/health",
    response_model=HealthResponse,
    summary="Check AI Service and subsystem health",
)
@health_router.get(
    "/api/v1/health",
    response_model=HealthResponse,
    include_in_schema=False,
)
async def health_check():
    whisper = get_whisper_service()
    stt_available = whisper.check_model_available()
    ffmpeg_available = audio_service.check_ffmpeg_available()

    is_healthy = stt_available and ffmpeg_available

    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        service="sds-voice-intelligence-ai-service",
        version="0.1.0",
        stt=STTHealthInfo(
            model_name=settings.WHISPER_MODEL,
            device=settings.WHISPER_DEVICE,
            compute_type=settings.WHISPER_COMPUTE_TYPE,
            loaded=whisper.is_loaded,
            available=stt_available,
        ),
        ffmpeg=FFmpegHealthInfo(
            available=ffmpeg_available,
            path=_sanitize_path(settings.FFMPEG_EXECUTABLE_PATH),
        ),
    )
