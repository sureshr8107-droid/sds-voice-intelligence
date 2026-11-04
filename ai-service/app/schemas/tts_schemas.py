"""Text-to-Speech (TTS) Pydantic Schemas
Phase 6.5 - SDS Voice Intelligence
"""
import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class TTSSynthesizeRequest(BaseModel):
    """Request payload for text-to-speech synthesis."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Text content to synthesize into speech audio",
    )
    speed: Optional[float] = Field(
        1.0,
        ge=0.5,
        le=2.0,
        description="Speech playback speed multiplier (0.5x to 2.0x, default 1.0)",
    )
    voice: Optional[str] = Field(
        "en_US-lessac-medium",
        description="Voice model identifier (defaults to en_US-lessac-medium)",
    )

    @field_validator("text")
    @classmethod
    def validate_text_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Text to synthesize must not be empty or whitespace only.")
        return stripped

    @field_validator("voice")
    @classmethod
    def sanitize_voice_identifier(cls, v: Optional[str]) -> str:
        if not v:
            return "en_US-lessac-medium"
        # Strict validation: prevent path traversal or special characters
        if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
            raise ValueError("Invalid voice identifier format.")
        return v


class TTSHealthInfo(BaseModel):
    """Piper TTS subsystem health status."""
    available: bool = Field(..., description="Whether Piper binary and voice model are ready")
    version: str = Field(..., description="Installed Piper binary version")
    model: str = Field(..., description="Configured default voice model")
    path: str = Field(..., description="Sanitized relative executable path")
    error: Optional[str] = Field(None, description="Error detail if unavailable")
