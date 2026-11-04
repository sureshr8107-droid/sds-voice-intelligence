"""Intent Classification API Routes
Phase 6.4 - SDS Voice Intelligence
"""
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Request, status, HTTPException
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.intent_schemas import (
    IntentClassifyRequest,
    IntentClassifyResponse,
)
from app.schemas.audio_schemas import ErrorResponse, ErrorDetail
from app.services.llm_service import get_llm_service, LLMServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/intent", tags=["Intent Classification"])
intent_router = router


def _get_request_id(request: Request, payload: Optional[IntentClassifyRequest] = None) -> str:
    """Extract correlation ID from header, request state, payload, or generate new UUID."""
    if payload and payload.correlation_id:
        return payload.correlation_id
    return getattr(request.state, "request_id", None) or str(uuid.uuid4().hex[:12])


@router.post(
    "/classify",
    response_model=IntentClassifyResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid, empty, or excessively long transcription"},
        500: {"model": ErrorResponse, "description": "Internal intent classification error"},
        503: {"model": ErrorResponse, "description": "LLM subsystem unavailable"},
    },
    summary="Classify caller speech transcription into structured intent",
    description="Processes caller transcription through local Ollama LLM to determine intent category, "
                "department routing, confidence score, urgency, and recommended response.",
)
async def classify_caller_intent(
    request: Request,
    payload: IntentClassifyRequest,
):
    request_id = _get_request_id(request, payload)

    # 1. Validate transcription content length and non-emptiness
    clean_text = payload.transcription.strip()
    if not clean_text:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="EMPTY_TRANSCRIPTION_TEXT",
                    message="Transcription text cannot be empty or whitespace only."
                ),
                request_id=request_id,
            ).model_dump(),
        )

    if len(clean_text) > settings.MAX_TRANSCRIPTION_LENGTH:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="TRANSCRIPTION_TOO_LONG",
                    message=f"Transcription length ({len(clean_text)}) exceeds the maximum allowed limit of {settings.MAX_TRANSCRIPTION_LENGTH} characters."
                ),
                request_id=request_id,
            ).model_dump(),
        )

    # 2. Invoke local LLM classification service
    try:
        llm = get_llm_service()
        result = llm.classify_intent(
            transcription=clean_text,
            language=payload.language or "en",
            request_id=request_id,
        )

        # Log non-PII operational metrics
        logger.info(
            "Intent classification complete | req_id=%s | intent=%s | conf=%.2f | fallback=%s | time=%.3fs",
            request_id,
            result.intent,
            result.confidence,
            result.fallback_used,
            result.processing_time or 0.0,
        )

        return result

    except LLMServiceError as lse:
        logger.error("LLM service error: %s", str(lse))
        return JSONResponse(
            status_code=lse.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code=lse.code, message=str(lse)),
                request_id=request_id,
            ).model_dump(),
        )
    except Exception as exc:
        logger.error("Unhandled error during intent classification: %s", str(exc), exc_info=False)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected error occurred during intent classification."
                ),
                request_id=request_id,
            ).model_dump(),
        )
