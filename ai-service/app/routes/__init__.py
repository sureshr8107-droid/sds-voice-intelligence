"""AI Service Routes Package."""
from app.routes.audio_routes import router as audio_router, health_router

__all__ = ["audio_router", "health_router"]
