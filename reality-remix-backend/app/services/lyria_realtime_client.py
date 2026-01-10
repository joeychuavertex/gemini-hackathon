"""
Lyria RealTime Music Generation Client.
Uses the Google GenAI SDK for low-latency continuous music streaming.
Generates audio in 2-second chunks with ~2 second latency (vs 20+ seconds for batch API).
"""
import asyncio
import logging
import base64
from typing import Optional, Callable, Awaitable

from google import genai
from google.genai import types

from app.models.schemas import Genre
from app.core.config import settings

logger = logging.getLogger(__name__)


class LyriaRealtimeClient:
    """Client for Lyria RealTime API using Google GenAI SDK for low-latency music."""

    LYRIA_MODEL = "models/lyria-realtime-exp"

    def __init__(
        self,
        api_key: str,
        genre: Genre,
        on_music_chunk: Callable[[str], Awaitable[None]],
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        """
        Initialize the Lyria RealTime client.

        Args:
            api_key: Google Generative AI API key
            genre: Commentary genre to match music style
            on_music_chunk: Callback for music audio chunks (base64 encoded)
            on_error: Callback for errors
        """
        self.api_key = api_key
        self.genre = genre
        self.on_music_chunk = on_music_chunk
        self.on_error = on_error

        self.client = None
        self.session = None
        self.is_connected = False
        self.is_playing = False
        self.receive_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

        # Music generation parameters
        self.current_prompt = self._get_genre_prompt(genre)
        self.bpm = self._get_genre_bpm(genre)

    def _get_genre_prompt(self, genre: Genre) -> str:
        """Get detailed music prompt based on genre."""
        prompt_map = {
            Genre.NATURE_DOCUMENTARY: "calm orchestral ambient, gentle strings, peaceful nature soundscape, serene flowing melody",
            Genre.SPORTS: "energetic stadium rock, electric guitars, drums, high energy anthem, powerful rhythm",
            Genre.THRILLER: "dark suspenseful ambient, mysterious minor key strings, ominous tension, building suspense",
            Genre.ROMCOM: "lighthearted acoustic pop, piano ukulele, romantic warm, playful uplifting melody",
            Genre.HORROR: "eerie horror ambient, creepy dissonant tones, unsettling atmosphere, spine-chilling drone",
            Genre.COOKING: "upbeat acoustic folk, guitar piano, cheerful warm, positive friendly vibe",
            Genre.SCIENCE: "futuristic electronic ambient, synthesizers, curious exploratory, technological soundscape",
            Genre.REALITY_TV: "dramatic pop electronic, reality show energy, catchy upbeat, exciting",
            Genre.TIME_TRAVELER: "epic cinematic orchestral, grand sweeping, historical timeless, majestic strings",
            Genre.GENZ: "modern electronic pop, synth bass, energetic contemporary, trendy upbeat",
            Genre.CORPORATE: "minimal ambient piano, professional calm, subtle background, focused",
            Genre.ACADEMIC: "classical chamber strings, refined serious, contemplative elegant composition",
            Genre.MUSICAL: "theatrical broadway orchestra, dramatic expressive, grand show tunes",
            Genre.SINGAPOREAN: "upbeat tropical pop, gamelan fusion, cheerful vibrant, Southeast Asian influences",
        }
        return prompt_map.get(genre, "ambient instrumental background music, pleasant unobtrusive")

    def _get_genre_bpm(self, genre: Genre) -> int:
        """Get appropriate BPM based on genre."""
        bpm_map = {
            Genre.NATURE_DOCUMENTARY: 70,
            Genre.SPORTS: 140,
            Genre.THRILLER: 80,
            Genre.ROMCOM: 100,
            Genre.HORROR: 60,
            Genre.COOKING: 110,
            Genre.SCIENCE: 90,
            Genre.REALITY_TV: 120,
            Genre.TIME_TRAVELER: 85,
            Genre.GENZ: 128,
            Genre.CORPORATE: 75,
            Genre.ACADEMIC: 65,
            Genre.MUSICAL: 100,
            Genre.SINGAPOREAN: 115,
        }
        return bpm_map.get(genre, 90)

    async def connect(self) -> bool:
        """
        Initialize the GenAI client for Lyria RealTime.

        Returns:
            True if initialized successfully, False otherwise
        """
        try:
            logger.info(f"🎵 Initializing Lyria RealTime client for genre: {self.genre}")

            # Create GenAI client with API key
            self.client = genai.Client(
                api_key=self.api_key,
                http_options={'api_version': 'v1alpha'}
            )

            self.is_connected = True
            logger.info("🎵 Lyria RealTime client initialized")

            return True

        except Exception as e:
            logger.error(f"🎵 Failed to initialize Lyria RealTime client: {e}", exc_info=True)
            if self.on_error:
                await self.on_error(f"Music initialization failed: {str(e)}")
            return False

    async def play(self):
        """Start continuous music generation."""
        if not self.is_connected or not self.client:
            logger.warning("🎵 Cannot play - client not initialized")
            return

        try:
            logger.info("🎵 Starting Lyria RealTime music stream...")
            self.is_playing = True
            self._stop_event.clear()

            # Start the music streaming task
            self.receive_task = asyncio.create_task(self._stream_music())

            logger.info("🎵 Music streaming started")

        except Exception as e:
            logger.error(f"🎵 Failed to start music: {e}", exc_info=True)
            if self.on_error:
                await self.on_error(f"Music start error: {str(e)}")

    async def _stream_music(self):
        """Stream music from Lyria RealTime."""
        try:
            async with self.client.aio.live.music.connect(
                model=self.LYRIA_MODEL
            ) as session:
                self.session = session
                logger.info("🎵 Connected to Lyria RealTime session")

                # Set up the music style
                await session.set_weighted_prompts(
                    prompts=[
                        types.WeightedPrompt(text=self.current_prompt, weight=1.0)
                    ]
                )
                logger.info(f"🎵 Set prompt: {self.current_prompt[:50]}...")

                # Set music generation config
                await session.set_music_generation_config(
                    config=types.LiveMusicGenerationConfig(
                        bpm=self.bpm,
                        temperature=1.0
                    )
                )
                logger.info(f"🎵 Set BPM: {self.bpm}")

                # Start playback
                await session.play()
                logger.info("🎵 Lyria playback started")

                # Receive and forward audio chunks
                async for message in session.receive():
                    if self._stop_event.is_set():
                        break

                    try:
                        # Extract audio from server_content.audio_chunks
                        if hasattr(message, 'server_content') and message.server_content:
                            server_content = message.server_content
                            
                            if hasattr(server_content, 'audio_chunks') and server_content.audio_chunks:
                                for audio_chunk in server_content.audio_chunks:
                                    if hasattr(audio_chunk, 'data') and audio_chunk.data:
                                        # Audio data is bytes, encode to base64 for WebSocket
                                        audio_b64 = base64.b64encode(audio_chunk.data).decode('utf-8')
                                        await self.on_music_chunk(audio_b64)
                                        logger.debug(f"🎵 Sent music chunk (size: {len(audio_b64)})")
                                        
                    except Exception as e:
                        logger.error(f"🎵 Error processing audio chunk: {e}", exc_info=True)

                logger.info("🎵 Music stream ended")

        except asyncio.CancelledError:
            logger.info("🎵 Music stream cancelled")
        except Exception as e:
            logger.error(f"🎵 Music streaming error: {e}", exc_info=True)
            if self.on_error:
                await self.on_error(f"Music streaming error: {str(e)}")
        finally:
            self.session = None
            self.is_playing = False

    async def pause(self):
        """Pause music generation."""
        self.is_playing = False
        self._stop_event.set()
        
        if self.session:
            try:
                await self.session.pause()
            except Exception as e:
                logger.warning(f"🎵 Error pausing session: {e}")
        
        logger.info("🎵 Music paused")

    async def change_genre(self, new_genre: Genre):
        """
        Change music genre.

        Args:
            new_genre: New genre to switch to
        """
        logger.info(f"🎵 Changing music genre from {self.genre} to {new_genre}")

        old_genre = self.genre
        self.genre = new_genre
        self.current_prompt = self._get_genre_prompt(new_genre)
        self.bpm = self._get_genre_bpm(new_genre)

        try:
            # If we have an active session, update the prompts
            if self.session and self.is_playing:
                await self.session.set_weighted_prompts(
                    prompts=[
                        types.WeightedPrompt(text=self.current_prompt, weight=1.0)
                    ]
                )
                await self.session.set_music_generation_config(
                    config=types.LiveMusicGenerationConfig(
                        bpm=self.bpm,
                        temperature=1.0
                    )
                )
                logger.info(f"🎵 Updated music style to {new_genre}")
            else:
                # Restart the stream with new settings
                was_playing = self.is_playing
                await self.disconnect()
                await self.connect()
                if was_playing:
                    await self.play()

            logger.info(f"🎵 Music genre changed to {new_genre}")

        except Exception as e:
            logger.error(f"🎵 Error changing genre: {e}")
            self.genre = old_genre
            self.current_prompt = self._get_genre_prompt(old_genre)
            self.bpm = self._get_genre_bpm(old_genre)
            if self.on_error:
                await self.on_error(f"Failed to change music genre: {str(e)}")

    async def disconnect(self):
        """Disconnect and cleanup."""
        logger.info("🎵 Disconnecting Lyria RealTime client")

        self.is_playing = False
        self._stop_event.set()

        # Cancel receive task
        if self.receive_task:
            self.receive_task.cancel()
            try:
                await self.receive_task
            except asyncio.CancelledError:
                pass
            self.receive_task = None

        self.session = None
        self.is_connected = False

        logger.info("🎵 Lyria RealTime client disconnected")

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
