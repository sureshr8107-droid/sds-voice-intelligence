"""Intent Classification Pydantic Schemas
Phase 6.4 - SDS Voice Intelligence
"""
from enum import Enum
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator


class IntentCategory(str, Enum):
    """Supported caller intent categories."""
    BILLING_ENQUIRY = "billing_enquiry"
    PAYMENT_ISSUE = "payment_issue"
    APPOINTMENT_BOOKING = "appointment_booking"
    APPOINTMENT_CANCELLATION = "appointment_cancellation"
    TECHNICAL_SUPPORT = "technical_support"
    COMPLAINT = "complaint"
    PRODUCT_ENQUIRY = "product_enquiry"
    ACCOUNT_ENQUIRY = "account_enquiry"
    GENERAL_ENQUIRY = "general_enquiry"
    UNKNOWN = "unknown"


# Centralized department routing map
INTENT_DEPARTMENT_MAP: Dict[str, Optional[str]] = {
    IntentCategory.BILLING_ENQUIRY.value: "Billing",
    IntentCategory.PAYMENT_ISSUE.value: "Billing",
    IntentCategory.APPOINTMENT_BOOKING.value: "Customer Service",
    IntentCategory.APPOINTMENT_CANCELLATION.value: "Customer Service",
    IntentCategory.TECHNICAL_SUPPORT.value: "Technical Support",
    IntentCategory.COMPLAINT.value: "Customer Relations",
    IntentCategory.PRODUCT_ENQUIRY.value: "Sales",
    IntentCategory.ACCOUNT_ENQUIRY.value: "Customer Service",
    IntentCategory.GENERAL_ENQUIRY.value: "General Support",
    IntentCategory.UNKNOWN.value: None,
}


UrgencyLevel = Literal["low", "normal", "high", "critical"]


class IntentClassifyRequest(BaseModel):
    """Request payload for intent classification."""
    transcription: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Caller speech transcription text to classify",
    )
    language: Optional[str] = Field("en", description="Transcription language code")
    call_id: Optional[str] = Field(None, description="Telephony call correlation ID")
    correlation_id: Optional[str] = Field(None, description="Client request correlation ID")

    @field_validator("transcription")
    @classmethod
    def validate_transcription_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Transcription text must not be empty or whitespace only.")
        return stripped


class LLMRawIntentOutput(BaseModel):
    """Direct structured output schema requested from the LLM."""
    intent: str = Field(..., description="Detected intent category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")
    urgency: UrgencyLevel = Field("normal", description="Urgency level")
    summary: str = Field(..., description="Brief summary of caller's issue")
    extracted_entities: Dict[str, Any] = Field(default_factory=dict, description="Explicit entities from caller speech")
    suggested_response: str = Field(..., description="Suggested verbal response for the caller")
    requires_clarification: bool = Field(False, description="Whether caller intent requires clarification")
    clarification_question: Optional[str] = Field(None, description="Short follow-up question if clarification needed")

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v: Any) -> float:
        try:
            val = float(v)
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return 0.0

    @field_validator("urgency", mode="before")
    @classmethod
    def normalize_urgency(cls, v: Any) -> str:
        if isinstance(v, str):
            v_lower = v.lower().strip()
            if v_lower in ("low", "normal", "high", "critical"):
                return v_lower
        return "normal"


class IntentClassifyResponse(BaseModel):
    """Validated structured classification response for API consumers."""
    success: bool = Field(True, description="Indicates whether classification completed")
    intent: str = Field(..., description="Validated intent category")
    department: Optional[str] = Field(None, description="Mapped department name or None if unknown")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Numeric confidence score bounded 0 to 1")
    urgency: UrgencyLevel = Field("normal", description="Urgency assessment")
    summary: str = Field(..., description="Brief summary of caller statement")
    extracted_entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities present in audio")
    suggested_response: str = Field(..., description="Safe suggested agent response")
    requires_clarification: bool = Field(False, description="Flag indicating clarification is needed")
    clarification_question: Optional[str] = Field(None, description="Clarification question if needed")
    fallback_used: bool = Field(False, description="Flag indicating whether a safe fallback response was generated")
    request_id: Optional[str] = Field(None, description="Request correlation identifier")
    processing_time: Optional[float] = Field(None, description="Inference processing time in seconds")

    @model_validator(mode="after")
    def sync_department(self) -> "IntentClassifyResponse":
        # Enforce canonical department mapping based on validated intent
        valid_intents = [item.value for item in IntentCategory]
        if self.intent not in valid_intents:
            self.intent = IntentCategory.UNKNOWN.value
            self.department = None
        else:
            self.department = INTENT_DEPARTMENT_MAP.get(self.intent, None)
        return self


class LLMHealthInfo(BaseModel):
    """Ollama LLM subsystem status."""
    available: bool = Field(..., description="Whether Ollama endpoint is reachable")
    model: str = Field(..., description="Configured LLM model name")
    endpoint: str = Field(..., description="Configured Ollama base URL")
    error: Optional[str] = Field(None, description="Error message if unavailable")

