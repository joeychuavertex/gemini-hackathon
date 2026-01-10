"""
The Reality Remix - FastAPI backend server.
Real-time video commentary using Gemini 2.0 Flash Live API.
"""
import logging
import json
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.models.schemas import (
    Genre,
    HealthResponse,
    WebSocketMessageType,
    SessionStartMessage,
    FrameMessage,
    GenreChangeMessage,
    AudioChunkMessage,
    ErrorMessage,
)
from app.services.genre_manager import GenreManager
from app.services.frame_processor import FrameProcessor
from app.services.gemini_live_client import GeminiLiveClient
from app.services.session_manager import session_manager

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for FastAPI application."""
    # Startup
    logger.info("Starting Reality Remix backend server...")
    logger.info(f"Gemini model: {settings.GEMINI_MODEL}")
    logger.info(f"CORS origins: {settings.allowed_origins_list}")

    yield

    # Shutdown
    logger.info("Shutting down Reality Remix backend server...")
    # Clean up any remaining sessions
    active_sessions = session_manager.get_active_session_count()
    if active_sessions > 0:
        logger.warning(f"Shutting down with {active_sessions} active sessions")


# Create FastAPI app
app = FastAPI(
    title="The Reality Remix API",
    description="Real-time video commentary using Gemini 2.0 Flash",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint."""
    return HealthResponse(status="ok", version="1.0.0")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", version="1.0.0")


@app.get("/api/genres")
async def list_genres():
    """Get list of available commentary genres."""
    genres = GenreManager.list_all_genres()
    return {"genres": [genre.dict() for genre in genres]}


@app.websocket("/ws/reality-remix")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for Reality Remix sessions.

    Protocol:
    1. Client connects
    2. Client sends SESSION_START message with genre
    3. Client sends FRAME messages with video frames
    4. Server sends AUDIO_CHUNK messages with commentary
    5. Client can send GENRE_CHANGE to switch genres
    6. Either party can close the connection
    """
    await websocket.accept()

    session_id = str(uuid.uuid4())
    gemini_client: GeminiLiveClient = None
    frame_processor: FrameProcessor = None
    current_genre: Genre = None

    logger.info(f"WebSocket connection established: session={session_id}")

    try:
        async for message in websocket.iter_text():
            try:
                data = json.loads(message)
                message_type = data.get("type")

                # Handle SESSION_START
                if message_type == WebSocketMessageType.SESSION_START:
                    start_msg = SessionStartMessage(**data)
                    current_genre = start_msg.genre

                    logger.info(
                        f"Session {session_id} starting with genre: {current_genre}, "
                        f"fps: {start_msg.fps}"
                    )

                    # Create session
                    try:
                        session_manager.create_session(
                            session_id=session_id,
                            genre=current_genre,
                            client_id=None  # Could use client IP or auth token
                        )
                    except ValueError as e:
                        # Send error if session creation fails
                        error = ErrorMessage(
                            type=WebSocketMessageType.ERROR,
                            message=str(e),
                            code="SESSION_LIMIT_EXCEEDED"
                        )
                        await websocket.send_text(error.model_dump_json())
                        await websocket.close()
                        return

                    # Initialize frame processor
                    frame_processor = FrameProcessor()

                    # Initialize Gemini client with callbacks
                    async def on_audio_chunk(audio_data: str):
                        """Forward audio chunks to client."""
                        import time
                        audio_msg = AudioChunkMessage(
                            type=WebSocketMessageType.AUDIO_CHUNK,
                            data=audio_data,
                            timestamp=int(time.time() * 1000)
                        )
                        await websocket.send_text(audio_msg.model_dump_json())

                    async def on_turn_complete():
                        """Notify client of turn complete."""
                        turn_msg = {
                            "type": WebSocketMessageType.TURN_COMPLETE
                        }
                        await websocket.send_text(json.dumps(turn_msg))

                    async def on_error(error_msg: str):
                        """Forward errors to client."""
                        error = ErrorMessage(
                            type=WebSocketMessageType.ERROR,
                            message=error_msg,
                            code="GEMINI_ERROR"
                        )
                        await websocket.send_text(error.model_dump_json())

                    gemini_client = GeminiLiveClient(
                        api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY,
                        genre=current_genre,
                        on_audio_chunk=on_audio_chunk,
                        on_turn_complete=on_turn_complete,
                        on_error=on_error,
                    )

                    # Connect to Gemini
                    success = await gemini_client.connect()

                    if not success:
                        error = ErrorMessage(
                            type=WebSocketMessageType.ERROR,
                            message="Failed to connect to Gemini Live API",
                            code="GEMINI_CONNECTION_FAILED"
                        )
                        await websocket.send_text(error.model_dump_json())
                        await websocket.close()
                        return

                    logger.info(f"Session {session_id} connected to Gemini")

                # Handle FRAME
                elif message_type == WebSocketMessageType.FRAME:
                    if not gemini_client or not frame_processor:
                        logger.warning("Received frame before session started")
                        continue

                    frame_msg = FrameMessage(**data)

                    # Process frame
                    try:
                        optimized_frame, is_scene_change = frame_processor.process_frame(
                            frame_msg.data
                        )

                        # Send to Gemini
                        await gemini_client.send_frame(optimized_frame)

                        # Update session stats
                        session_manager.update_frame_count(session_id)

                        logger.debug(
                            f"Processed frame for session {session_id}: "
                            f"scene_change={is_scene_change}"
                        )

                    except Exception as e:
                        logger.error(f"Error processing frame: {e}")
                        error = ErrorMessage(
                            type=WebSocketMessageType.ERROR,
                            message=f"Frame processing error: {str(e)}",
                            code="FRAME_PROCESSING_ERROR"
                        )
                        await websocket.send_text(error.model_dump_json())

                # Handle GENRE_CHANGE
                elif message_type == WebSocketMessageType.GENRE_CHANGE:
                    if not gemini_client:
                        logger.warning("Received genre change before session started")
                        continue

                    genre_msg = GenreChangeMessage(**data)
                    new_genre = genre_msg.genre

                    logger.info(f"Session {session_id} changing genre to {new_genre}")

                    # Update session
                    session_manager.change_genre(session_id, new_genre)

                    # Reset frame processor (new scene)
                    if frame_processor:
                        frame_processor.reset()

                    # Change genre in Gemini client (reconnects)
                    await gemini_client.change_genre(new_genre)

                    current_genre = new_genre

                # Handle SESSION_STOP
                elif message_type == WebSocketMessageType.SESSION_STOP:
                    logger.info(f"Session {session_id} stopping by client request")
                    break

                else:
                    logger.warning(f"Unknown message type: {message_type}")

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON from client: {e}")
                error = ErrorMessage(
                    type=WebSocketMessageType.ERROR,
                    message="Invalid JSON message",
                    code="INVALID_JSON"
                )
                await websocket.send_text(error.model_dump_json())

            except Exception as e:
                logger.error(f"Error handling message: {e}", exc_info=True)
                error = ErrorMessage(
                    type=WebSocketMessageType.ERROR,
                    message=f"Server error: {str(e)}",
                    code="SERVER_ERROR"
                )
                await websocket.send_text(error.model_dump_json())

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)

    finally:
        # Cleanup
        if gemini_client:
            await gemini_client.disconnect()

        session_manager.end_session(session_id)

        # Log session stats
        stats = session_manager.get_session_stats(session_id)
        if stats:
            logger.info(
                f"Session {session_id} ended: "
                f"duration={stats['duration_seconds']:.1f}s, "
                f"frames={stats['frame_count']}, "
                f"fps={stats['frames_per_second']:.2f}"
            )

        logger.info(f"WebSocket connection closed: session={session_id}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )
