"""AI Service Routes Package."""
from app.routes.audio_routes import router as audio_router, health_router
from app.routes.intent_routes import router as intent_router
from app.routes.tts_routes import router as tts_router

__all__ = ["audio_router", "health_router", "intent_router", "tts_router"]
