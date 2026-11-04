"""SDS Voice Intelligence - AI Service Main Application
Phase 6.3 - Audio Processing & STT Service
"""
import uuid
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.types import ASGIApp, Scope, Receive, Send

from app.config import settings
from app.routes.audio_routes import audio_router, health_router
from app.schemas.audio_schemas import ErrorResponse, ErrorDetail


class RequestCorrelationMiddleware:
    """Pure ASGI middleware for request ID correlation and timing (avoids BaseHTTPMiddleware deadlocks)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        req_id = headers.get(b"x-request-id", b"").decode("utf-8")
        if not req_id:
            req_id = str(uuid.uuid4().hex[:12])

        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = req_id

        start_time = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                duration = time.perf_counter() - start_time
                resp_headers = list(message.get("headers", []))
                resp_headers.append((b"x-request-id", req_id.encode("utf-8")))
                resp_headers.append((b"x-process-time", f"{duration:.4f}s".encode("utf-8")))
                message["headers"] = resp_headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and graceful shutdown."""
    settings.AUDIO_TMP_DIR.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="SDS Voice Intelligence - Local AI Service",
        description="Local CPU-optimized Speech-to-Text (STT) and Audio Processing Microservice.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Pure ASGI Request Correlation Middleware
    app.add_middleware(RequestCorrelationMiddleware)

    # Validation Error Handler
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = getattr(request.state, "request_id", str(uuid.uuid4().hex[:12]))
        errors = exc.errors()
        msg = errors[0].get("msg", "Invalid request parameters.") if errors else "Validation error."
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(code="VALIDATION_ERROR", message=msg),
                request_id=req_id,
            ).model_dump(),
        )

    # Global Unhandled Exception Handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", str(uuid.uuid4().hex[:12]))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected internal server error occurred."
                ),
                request_id=req_id,
            ).model_dump(),
        )

    # Include Subsystem Routers
    app.include_router(health_router)
    app.include_router(audio_router)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "service": "SDS Voice Intelligence AI Service",
            "tagline": "Intelligent Calls. Smarter Connections.",
            "version": "0.1.0",
            "phase": "Phase 6.3 - Audio Processing & STT",
            "status": "operational",
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "transcribe": "/api/v1/audio/transcribe",
            },
        }

    return app


# Application entrypoint
app = create_app()
