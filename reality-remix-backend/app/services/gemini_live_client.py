"""
Gemini Live API WebSocket client for bidirectional streaming.
"""
import asyncio
import json
import logging
from typing import Optional, Callable, Awaitable
import websockets
from websockets.client import WebSocketClientProtocol

from app.core.config import settings
from app.models.schemas import Genre
from app.services.genre_manager import GenreManager

logger = logging.getLogger(__name__)


class GeminiLiveClient:
    """Client for Gemini Live API with WebSocket bidirectional streaming."""

    def __init__(
        self,
        api_key: str,
        genre: Genre,
        on_audio_chunk: Optional[Callable[[str], Awaitable[None]]] = None,
        on_turn_complete: Optional[Callable[[], Awaitable[None]]] = None,
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        """
        Initialize Gemini Live API client.

        Args:
            api_key: Google Generative AI API key
            genre: Commentary genre for system prompt
            on_audio_chunk: Callback for audio chunks (base64 PCM)
            on_turn_complete: Callback when turn is complete
            on_error: Callback for errors
        """
        self.api_key = api_key
        self.genre = genre
        self.on_audio_chunk = on_audio_chunk
        self.on_turn_complete = on_turn_complete
        self.on_error = on_error

        self.websocket: Optional[WebSocketClientProtocol] = None
        self.is_connected = False
        self.receive_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        """
        Connect to Gemini Live API and send setup message.

        Returns:
            True if connected successfully, False otherwise
        """
        try:
            # Build WebSocket URL with API key
            ws_url = f"{settings.GEMINI_WS_URL}?key={self.api_key}"

            logger.info(f"Connecting to Gemini Live API with genre: {self.genre}")

            # Connect to WebSocket
            self.websocket = await websockets.connect(
                ws_url,
                additional_headers={
                    "Content-Type": "application/json",
                },
                ping_interval=30,
                ping_timeout=10,
            )

            self.is_connected = True
            logger.info("Connected to Gemini Live API")

            # Send setup message with genre-specific system prompt
            await self._send_setup_message()

            # Start receiving messages
            self.receive_task = asyncio.create_task(self._receive_messages())

            return True

        except Exception as e:
            logger.error(f"Failed to connect to Gemini Live API: {e}")
            if self.on_error:
                await self.on_error(f"Connection failed: {str(e)}")
            return False

    async def _send_setup_message(self):
        """Send initial setup message with system prompt."""
        setup_message = GenreManager.format_for_gemini_setup(self.genre)

        logger.debug(f"Sending setup message: {json.dumps(setup_message, indent=2)}")

        await self.websocket.send(json.dumps(setup_message))
        logger.info(f"Sent setup message for genre: {self.genre}")

    async def send_frame(self, base64_jpeg: str):
        """
        Send a video frame to Gemini for analysis.

        Args:
            base64_jpeg: Base64-encoded JPEG image
        """
        if not self.is_connected or not self.websocket:
            logger.warning("Cannot send frame: not connected to Gemini")
            return

        try:
            # Build client content message
            message = {
                "client_content": {
                    "turns": [
                        {
                            "role": "user",
                            "parts": [
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": base64_jpeg
                                    }
                                }
                            ]
                        }
                    ],
                    "turn_complete": True
                }
            }

            await self.websocket.send(json.dumps(message))
            logger.debug(f"Sent frame to Gemini (size: {len(base64_jpeg)} chars)")

        except Exception as e:
            logger.error(f"Error sending frame to Gemini: {e}")
            if self.on_error:
                await self.on_error(f"Failed to send frame: {str(e)}")

    async def change_genre(self, new_genre: Genre):
        """
        Change the commentary genre mid-session.

        Note: This requires reconnecting with a new setup message.

        Args:
            new_genre: New genre to switch to
        """
        logger.info(f"Changing genre from {self.genre} to {new_genre}")

        # Update genre
        old_genre = self.genre
        self.genre = new_genre

        try:
            # Disconnect and reconnect with new genre
            await self.disconnect()
            success = await self.connect()

            if success:
                logger.info(f"Successfully changed genre to {new_genre}")
            else:
                # Rollback on failure
                self.genre = old_genre
                logger.error(f"Failed to change genre, rolling back to {old_genre}")

        except Exception as e:
            logger.error(f"Error changing genre: {e}")
            self.genre = old_genre
            if self.on_error:
                await self.on_error(f"Failed to change genre: {str(e)}")

    async def _receive_messages(self):
        """Receive and process messages from Gemini Live API."""
        try:
            async for message in self.websocket:
                await self._handle_message(message)

        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Gemini WebSocket connection closed. Code: {e.code}, Reason: {e.reason}")
            self.is_connected = False
            # Forward quota errors to frontend so user knows
            if self.on_error and (e.code == 1011 or "quota" in str(e.reason).lower()):
                 await self.on_error(f"Gemini Quota Exceeded: {e.reason}")

        except Exception as e:
            logger.error(f"Error receiving messages from Gemini: {e}")
            self.is_connected = False
            if self.on_error:
                await self.on_error(f"Receive error: {str(e)}")

    async def _handle_message(self, message: str):
        """
        Handle a message from Gemini Live API.

        Args:
            message: JSON message from Gemini
        """
        try:
            data = json.loads(message)
            logger.debug(f"📥 Gemini message keys: {list(data.keys())}")

            # Handle server content (audio response)
            if "serverContent" in data:
                server_content = data["serverContent"]
                logger.info(f"📦 serverContent keys: {list(server_content.keys())}")

                # Extract audio chunks
                if "modelTurn" in server_content:
                    model_turn = server_content["modelTurn"]
                    logger.info(f"🎬 modelTurn keys: {list(model_turn.keys())}")

                    if "parts" in model_turn:
                        logger.info(f"🧩 Found {len(model_turn['parts'])} parts")
                        for i, part in enumerate(model_turn["parts"]):
                            logger.info(f"  Part {i} keys: {list(part.keys())}")

                            if "inlineData" in part:
                                inline_data = part["inlineData"]
                                mime_type = inline_data.get("mimeType", "")
                                logger.info(f"  🎵 Found inlineData with mimeType: {mime_type}")

                                if mime_type.startswith("audio/pcm"):
                                    # Got audio chunk
                                    audio_data = inline_data.get("data", "")
                                    logger.info(f"✅ Got audio chunk! Size: {len(audio_data)} chars")
                                    if audio_data and self.on_audio_chunk:
                                        await self.on_audio_chunk(audio_data)
                                        logger.info(f"🔊 Sent audio chunk to frontend (size: {len(audio_data)})")
                                    else:
                                        logger.warning("⚠️ Audio data empty or no callback")

                # Handle turn complete
                if server_content.get("turnComplete"):
                    logger.info("✅ Turn complete received from Gemini")
                    if self.on_turn_complete:
                        await self.on_turn_complete()

            # Handle setup complete
            elif "setupComplete" in data:
                logger.info("✅ Gemini setup complete")

            # Handle errors
            elif "error" in data:
                error_msg = data["error"].get("message", "Unknown error")
                logger.error(f"❌ Gemini API error: {error_msg}")
                if self.on_error:
                    await self.on_error(error_msg)

            else:
                logger.debug(f"📨 Received other message type: {list(data.keys())}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini message: {e}")
        except Exception as e:
            logger.error(f"Error handling Gemini message: {e}")

    async def disconnect(self):
        """Disconnect from Gemini Live API."""
        if self.websocket:
            try:
                logger.info("Disconnecting from Gemini Live API")

                # Cancel receive task
                if self.receive_task:
                    self.receive_task.cancel()
                    try:
                        await self.receive_task
                    except asyncio.CancelledError:
                        pass

                # Close WebSocket
                await self.websocket.close()
                self.websocket = None
                self.is_connected = False

                logger.info("Disconnected from Gemini Live API")

            except Exception as e:
                logger.error(f"Error disconnecting from Gemini: {e}")

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
