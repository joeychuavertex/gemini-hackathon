"""
Gemini Lyria-002 Music Generation Client.
Handles background music generation based on genre using Vertex AI REST API.
"""
import logging
import asyncio
import json
import base64
from typing import Optional, Callable, Awaitable
from google.oauth2 import service_account
from google.auth.transport.requests import Request
import httpx

from app.models.schemas import Genre
from app.core.config import settings

logger = logging.getLogger(__name__)


class LyriaMusicClient:
    """Client for Gemini Lyria-002 music generation using Vertex AI."""

    def __init__(
        self,
        api_key: str,  # Not used for Vertex AI, kept for compatibility
        genre: Genre,
        on_music_chunk: Callable[[str], Awaitable[None]],
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        """
        Initialize the Lyria music client.

        Args:
            api_key: Not used (Vertex AI uses service account)
            genre: Commentary genre to match music style
            on_music_chunk: Callback for music audio chunks (base64 WAV)
            on_error: Callback for errors
        """
        self.genre = genre
        self.on_music_chunk = on_music_chunk
        self.on_error = on_error

        self.is_connected = False
        self.is_playing = False
        self.credentials = None
        self.http_client: Optional[httpx.AsyncClient] = None

        # Music generation parameters
        self.current_prompt = self._get_genre_prompt(genre)

    def _get_genre_prompt(self, genre: Genre) -> str:
        """Get detailed music prompt based on genre."""
        prompt_map = {
            Genre.NATURE_DOCUMENTARY: "Calm orchestral music with gentle strings, woodwinds, and peaceful nature ambiance, serene and contemplative, flowing melody",
            Genre.SPORTS: "Energetic upbeat rock music with electric guitars and drums, exciting stadium anthem, high energy, powerful rhythm",
            Genre.THRILLER: "Dark suspenseful music with tension, mysterious strings in minor key, ominous atmosphere, building suspense",
            Genre.ROMCOM: "Lighthearted cheerful acoustic music with piano and ukulele, romantic and warm, playful melody, uplifting",
            Genre.HORROR: "Eerie horror ambient music with creepy sounds, dissonant tones, unsettling atmosphere, spine-chilling",
            Genre.COOKING: "Upbeat friendly acoustic music with guitar and piano, cheerful and inviting, warm melody, positive vibes",
            Genre.SCIENCE: "Futuristic electronic ambient music with synthesizers, curious and exploratory soundscape, technological",
            Genre.REALITY_TV: "Dramatic catchy pop music with electronic elements, reality show energy, upbeat and exciting",
            Genre.TIME_TRAVELER: "Epic cinematic orchestral music, grand and sweeping, historical and timeless, majestic",
            Genre.GENZ: "Modern trendy pop electronic music with synth and bass, energetic upbeat, contemporary vibe",
            Genre.CORPORATE: "Professional minimal ambient music with soft piano, subtle background, calm and focused",
            Genre.ACADEMIC: "Classical refined chamber music with strings, serious and contemplative, elegant composition",
            Genre.MUSICAL: "Theatrical dramatic broadway music with orchestra, expressive show tunes, grand performance",
        }
        return prompt_map.get(genre, "Ambient background music, instrumental, pleasant and unobtrusive")

    async def connect(self) -> bool:
        """Initialize credentials and HTTP client for Vertex AI."""
        try:
            logger.info(f"🎵 Initializing Lyria music client for genre: {self.genre}")

            # Check if service account JSON is provided
            if not settings.GCP_SERVICE_ACCOUNT_JSON:
                logger.error("🎵 GCP_SERVICE_ACCOUNT_JSON not provided in environment variables")
                logger.warning("🎵 Music generation will be disabled. Please set up service account credentials.")
                self.is_connected = True  # Mark as connected for graceful degradation
                return True

            # Parse service account JSON from environment variable
            try:
                credentials_dict = json.loads(settings.GCP_SERVICE_ACCOUNT_JSON)
                logger.info("🎵 Service account JSON parsed successfully")
            except json.JSONDecodeError as e:
                logger.error(f"🎵 Failed to parse service account JSON: {e}")
                logger.warning("🎵 Music generation will be disabled")
                self.is_connected = True
                return True

            # Create credentials from service account info
            self.credentials = service_account.Credentials.from_service_account_info(
                credentials_dict,
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )

            logger.info("🎵 Service account credentials created")

            # Create HTTP client
            self.http_client = httpx.AsyncClient(timeout=120.0)  # 2 minutes timeout for generation

            self.is_connected = True
            logger.info(f"🎵 Lyria music client initialized successfully for {self.genre}")

            return True

        except Exception as e:
            logger.error(f"Failed to initialize Lyria client: {e}", exc_info=True)
            logger.warning("🎵 Music generation will be disabled")
            self.is_connected = True  # Graceful degradation
            if self.on_error:
                await self.on_error(f"Music initialization error: {str(e)}")
            return True

    async def play(self):
        """Start generating music by creating the first clip."""
        if not self.is_connected:
            logger.warning("🎵 Cannot play - not connected")
            return

        if not self.credentials or not self.http_client:
            logger.warning("🎵 Credentials not available, skipping music generation")
            return

        try:
            logger.info("🎵 Starting music generation...")
            self.is_playing = True

            # Generate first music clip
            await self._generate_and_send_clip()

            logger.info("🎵 Music playback started successfully!")
        except Exception as e:
            logger.error(f"Failed to start music generation: {e}", exc_info=True)
            if self.on_error:
                await self.on_error(f"Music generation error: {str(e)}")

    async def pause(self):
        """Pause music generation."""
        self.is_playing = False
        logger.info("🎵 Music generation paused")

    async def _generate_and_send_clip(self):
        """Generate a single 30-second music clip and send to frontend."""
        if not self.http_client or not self.credentials:
            logger.warning("🎵 Cannot generate clip - missing credentials or HTTP client")
            return

        try:
            logger.info(f"🎵 Generating music clip with prompt: {self.current_prompt[:50]}...")

            # Ensure credentials are fresh
            if not self.credentials.valid:
                self.credentials.refresh(Request())

            # Build Vertex AI API endpoint
            endpoint = (
                f"https://{settings.GCP_LOCATION}-aiplatform.googleapis.com/v1/"
                f"projects/{settings.GCP_PROJECT_ID}/locations/{settings.GCP_LOCATION}/"
                f"publishers/google/models/lyria-002:predict"
            )

            # Prepare request payload
            payload = {
                "instances": [{
                    "prompt": self.current_prompt
                }]
            }

            # Get access token
            auth_token = self.credentials.token

            # Make API request
            logger.info(f"🎵 Sending request to Vertex AI: {endpoint}")
            response = await self.http_client.post(
                endpoint,
                json=payload,
                headers={
                    "Authorization": f"Bearer {auth_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                result = response.json()
                logger.info("🎵 Successfully received response from Lyria API")

                # Extract audio data from response
                if "predictions" in result and len(result["predictions"]) > 0:
                    prediction = result["predictions"][0]

                    # Lyria API returns 'bytesBase64Encoded' not 'audioContent'
                    if "bytesBase64Encoded" in prediction:
                        # Audio is already base64 encoded
                        base64_audio = prediction["bytesBase64Encoded"]

                        # Forward to callback
                        await self.on_music_chunk(base64_audio)

                        logger.info(f"🎵 Music clip sent to frontend (30 seconds)")
                    elif "audioContent" in prediction:
                        # Fallback to audioContent if API changes
                        base64_audio = prediction["audioContent"]
                        await self.on_music_chunk(base64_audio)
                        logger.info(f"🎵 Music clip sent to frontend (30 seconds)")
                    else:
                        logger.error(f"🎵 No audio data in prediction: {prediction.keys()}")
                else:
                    logger.error(f"🎵 Unexpected response format: {result.keys()}")

            else:
                error_text = response.text
                logger.error(f"🎵 Lyria API request failed: {response.status_code} - {error_text}")
                if self.on_error:
                    await self.on_error(f"Music generation failed: {response.status_code}")

        except Exception as e:
            logger.error(f"Error generating music clip: {e}", exc_info=True)
            if self.on_error:
                await self.on_error(f"Music generation error: {str(e)}")

    async def change_genre(self, new_genre: Genre):
        """
        Change music genre by immediately generating new music.

        Args:
            new_genre: New genre to switch to
        """
        logger.info(f"🎵 Changing music genre from {self.genre} to {new_genre}")

        # Update genre and prompt
        self.genre = new_genre
        self.current_prompt = self._get_genre_prompt(new_genre)

        logger.info(f"🎵 New music prompt: {self.current_prompt[:80]}...")

        # Immediately generate new music clip if playing
        if self.is_playing:
            await self._generate_and_send_clip()

        logger.info(f"🎵 Music genre changed to {new_genre}")

    async def disconnect(self):
        """Disconnect and cleanup."""
        logger.info("🎵 Disconnecting Lyria music client")
        self.is_connected = False
        self.is_playing = False

        # Close HTTP client
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

        logger.info("🎵 Lyria music client disconnected")
