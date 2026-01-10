"""
Configuration management using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Gemini API Configuration
    GOOGLE_GENERATIVE_AI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash-native-audio-dialog"
    GEMINI_WS_URL: str = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:19006"

    # Frame Processing Configuration
    MAX_FRAME_WIDTH: int = 512
    MAX_FRAME_HEIGHT: int = 512
    JPEG_QUALITY: int = 70
    SCENE_CHANGE_THRESHOLD: float = 0.15  # 15% pixel difference
    STATIC_SCENE_FPS: float = 1.0
    DYNAMIC_SCENE_FPS: float = 2.0

    # Session Configuration
    MAX_SESSION_DURATION_SECONDS: int = 600  # 10 minutes
    MAX_DAILY_USAGE_SECONDS: int = 1800  # 30 minutes per user

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# Global settings instance
settings = Settings()
