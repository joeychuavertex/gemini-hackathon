"""
Pydantic models for request/response validation and WebSocket messages.
"""
from enum import Enum
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Genre(str, Enum):
    """Available commentary genres."""
    NATURE_DOCUMENTARY = "nature_documentary"
    SPORTS = "sports"
    THRILLER = "thriller"
    ROMCOM = "romcom"
    HORROR = "horror"
    COOKING = "cooking"
    SCIENCE = "science"
    REALITY_TV = "reality_tv"
    TIME_TRAVELER = "time_traveler_historian"
    GENZ = "genz_slang"
    CORPORATE = "corporate_consultant"
    ACADEMIC = "overly_serious_academic"
    MUSICAL = "musical_narrator"
    ANIME = "anime_narrator"
    STANDUP = "standup_comedian"
    SINGAPOREAN = "singaporean"
    SUNDAR_PICHAI = "sundar_pichai"


class WebSocketMessageType(str, Enum):
    """WebSocket message types."""
    SESSION_START = "session_start"
    FRAME = "frame"
    GENRE_CHANGE = "genre_change"
    AUDIO_CHUNK = "audio_chunk"
    MUSIC_CHUNK = "music_chunk"
    TURN_COMPLETE = "turn_complete"
    ERROR = "error"
    SESSION_STOP = "session_stop"
    TRANSCRIPTION = "transcription"
    MUSIC_TOGGLE = "music_toggle"


class SessionStartMessage(BaseModel):
    """Client message to start a new session."""
    type: Literal[WebSocketMessageType.SESSION_START] = WebSocketMessageType.SESSION_START
    genre: Genre
    fps: float = Field(default=1.0, ge=0.5, le=2.0, description="Frames per second")
    enable_music: bool = Field(default=True, description="Enable background music generation")


class FrameMessage(BaseModel):
    """Client message containing a video frame."""
    type: Literal[WebSocketMessageType.FRAME] = WebSocketMessageType.FRAME
    data: str = Field(..., description="Base64-encoded JPEG image")
    timestamp: int = Field(..., description="Client timestamp in milliseconds")


class GenreChangeMessage(BaseModel):
    """Client message to change genre mid-session."""
    type: Literal[WebSocketMessageType.GENRE_CHANGE] = WebSocketMessageType.GENRE_CHANGE
    genre: Genre


class SessionStopMessage(BaseModel):
    """Client message to stop the session."""
    type: Literal[WebSocketMessageType.SESSION_STOP] = WebSocketMessageType.SESSION_STOP


class AudioChunkMessage(BaseModel):
    """Server message containing audio commentary."""
    type: Literal[WebSocketMessageType.AUDIO_CHUNK] = WebSocketMessageType.AUDIO_CHUNK
    data: str = Field(..., description="Base64-encoded PCM audio")
    timestamp: int = Field(..., description="Server timestamp in milliseconds")


class TurnCompleteMessage(BaseModel):
    """Server message indicating commentary turn is complete."""
    type: Literal[WebSocketMessageType.TURN_COMPLETE] = WebSocketMessageType.TURN_COMPLETE


class ErrorMessage(BaseModel):
    """Server message indicating an error occurred."""
    type: Literal[WebSocketMessageType.ERROR] = WebSocketMessageType.ERROR
    message: str
    code: Optional[str] = None


class TranscriptionMessage(BaseModel):
    """Server message containing transcription text."""
    type: Literal[WebSocketMessageType.TRANSCRIPTION] = WebSocketMessageType.TRANSCRIPTION
    text: str = Field(..., description="Transcribed text from audio output")
    timestamp: int = Field(..., description="Server timestamp in milliseconds")


class GenreInfo(BaseModel):
    """Information about a genre."""
    id: Genre
    name: str
    description: str
    icon: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str = "1.0.0"


# Gemini Live API Message Schemas
class GeminiInlineData(BaseModel):
    """Inline data for Gemini API (image or audio)."""
    mime_type: str
    data: str


class GeminiPart(BaseModel):
    """Part of a Gemini message."""
    inline_data: Optional[GeminiInlineData] = None
    text: Optional[str] = None


class GeminiTurn(BaseModel):
    """A turn in Gemini conversation."""
    role: Literal["user", "model"]
    parts: list[GeminiPart]


class GeminiClientContent(BaseModel):
    """Client content message to Gemini."""
    turns: list[GeminiTurn]
    turn_complete: bool = True


class GeminiModelTurn(BaseModel):
    """Model turn in Gemini response."""
    parts: list[GeminiPart]


class GeminiServerContent(BaseModel):
    """Server content response from Gemini."""
    model_turn: Optional[GeminiModelTurn] = None
    turn_complete: Optional[bool] = None


class GeminiSetupMessage(BaseModel):
    """Setup message for Gemini Live API."""
    setup: dict


class GeminiClientContentMessage(BaseModel):
    """Client content message wrapper."""
    client_content: GeminiClientContent


class GeminiServerContentMessage(BaseModel):
    """Server content message wrapper."""
    server_content: GeminiServerContent
    server_text: Optional[str] = None


class GeminiToolCall(BaseModel):
    """Tool call from Gemini (not used in this app)."""
    tool_call: Optional[dict] = None


# Music Generation Schemas
class MusicChunkMessage(BaseModel):
    """Server message containing background music chunk."""
    type: Literal[WebSocketMessageType.MUSIC_CHUNK] = WebSocketMessageType.MUSIC_CHUNK
    data: str = Field(..., description="Base64-encoded music audio data")
    timestamp: int = Field(..., description="Server timestamp in milliseconds")


class MusicToggleMessage(BaseModel):
    """Client message to toggle background music on/off."""
    type: Literal[WebSocketMessageType.MUSIC_TOGGLE] = WebSocketMessageType.MUSIC_TOGGLE
    enabled: bool = Field(..., description="Enable or disable background music")


class MusicGenerationConfig(BaseModel):
    """Configuration for Lyria music generation."""
    bpm: Optional[int] = Field(default=120, ge=60, le=200, description="Beats per minute")
    guidance: Optional[float] = Field(default=4.0, ge=0.0, le=6.0, description="Prompt adherence strength")
    density: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Note/sound density")
    brightness: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Tonal quality")
    temperature: Optional[float] = Field(default=1.1, ge=0.0, le=3.0, description="Generation randomness")
    top_k: Optional[int] = Field(default=40, ge=1, le=1000, description="Top-k sampling")


class WeightedPrompt(BaseModel):
    """Weighted prompt for music generation."""
    text: str = Field(..., description="Musical description (genre, instrument, mood)")
    weight: float = Field(default=1.0, description="Prompt weight")
