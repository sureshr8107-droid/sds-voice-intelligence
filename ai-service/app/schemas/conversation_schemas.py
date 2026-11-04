"""Conversation Pipeline Pydantic Schemas
Phase 6.6 - SDS Voice Intelligence
"""
from typing import Optional
from pydantic import BaseModel, Field


class AudioMetadata(BaseModel):
    """Audio metadata for the synthesized speech response."""
    format: str = Field("wav", description="Audio container format (always wav)")
    sample_rate: int = Field(22050, description="Audio sample rate in Hz (Piper default: 22,050 Hz)")
    channels: int = Field(1, description="Number of audio channels (1 = Mono)")
    bit_depth: int = Field(16, description="Audio PCM bit depth (16-bit PCM)")
    duration: float = Field(..., description="Duration of synthesized speech in seconds")
    size_bytes: int = Field(..., description="Size of synthesized WAV audio bytes")


class ConversationPipelineResponse(BaseModel):
    """Structured response model for full end-to-end conversation pipeline."""
    success: bool = Field(True, description="Overall pipeline execution success status")
    request_id: str = Field(..., description="Unique request correlation ID")
    transcript: str = Field(..., description="Recognized speech transcript from caller audio")
    intent: str = Field(..., description="Classified intent category")
    department: Optional[str] = Field(None, description="Recommended department for call routing")
    confidence: float = Field(..., description="Confidence score for intent classification (0.0 to 1.0)")
    urgency: str = Field("normal", description="Detected urgency level (low, normal, high, critical)")
    summary: str = Field(..., description="Concise factual summary of caller inquiry")
    response_text: str = Field(..., description="Caller-facing spoken response text")
    requires_clarification: bool = Field(False, description="Whether caller clarification is required")
    clarification_question: Optional[str] = Field(None, description="Follow-up question if clarification is needed")
    fallback_used: bool = Field(False, description="Whether deterministic fallback was triggered")
    audio_metadata: AudioMetadata = Field(..., description="Metadata for synthesized WAV audio")
    audio: AudioMetadata = Field(..., description="Alias reference for audio metadata")
    audio_base64: str = Field(..., description="Base64-encoded WAV audio data")
    processing_time: float = Field(..., description="Total pipeline execution latency in seconds")

