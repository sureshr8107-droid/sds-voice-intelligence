"""Audio Processing and STT Pydantic Schemas
Phase 6.3 - SDS Voice Intelligence
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class TranscriptionData(BaseModel):
    """Core transcription payload fields."""
    transcript: str = Field(..., description="Recognized speech text")
    detected_language: str = Field(..., description="Detected ISO language code (e.g. 'en')")
    language_probability: float = Field(..., description="Confidence score for language detection")
    duration: float = Field(..., description="Audio duration in seconds")
    processing_time: float = Field(..., description="Transcription processing time in seconds")
    real_time_factor: Optional[float] = Field(None, description="Inference time / audio duration (RTF)")


class TranscriptionResponse(BaseModel):
    """Standard success response for speech-to-text transcription."""
    success: bool = Field(True, description="Operation success indicator")
    transcript: str = Field(..., description="Recognized speech text")
    detected_language: str = Field(..., description="Detected ISO language code (e.g. 'en')")
    language_probability: float = Field(..., description="Confidence score for language detection")
    duration: float = Field(..., description="Audio duration in seconds")
    processing_time: float = Field(..., description="Transcription processing time in seconds")
    real_time_factor: Optional[float] = Field(None, description="Real-time factor")
    request_id: Optional[str] = Field(None, description="Request correlation identifier")


class ErrorDetail(BaseModel):
    """Detailed error object without leaking internal paths or traces."""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")


class ErrorResponse(BaseModel):
    """Standard error response format across the AI service."""
    success: bool = Field(False, description="Failure indicator")
    error: ErrorDetail = Field(..., description="Error details")
    request_id: Optional[str] = Field(None, description="Request correlation identifier")


class STTHealthInfo(BaseModel):
    """STT model health details."""
    model_name: str
    device: str
    compute_type: str
    loaded: bool
    available: bool


class FFmpegHealthInfo(BaseModel):
    """FFmpeg binary health details."""
    available: bool
    path: str


class HealthResponse(BaseModel):
    """Service health response."""
    status: str = Field(..., description="Service overall status (healthy/degraded)")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service semantic version")
    stt: STTHealthInfo = Field(..., description="STT subsystem status")
    ffmpeg: FFmpegHealthInfo = Field(..., description="FFmpeg subsystem status")
