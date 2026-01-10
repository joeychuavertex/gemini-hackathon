"""
Session management for tracking WebSocket connections and usage.
"""
import time
import logging
from typing import Dict, Optional
from dataclasses import dataclass, field
from app.models.schemas import Genre

logger = logging.getLogger(__name__)


@dataclass
class SessionInfo:
    """Information about an active session."""
    session_id: str
    genre: Genre
    start_time: float = field(default_factory=time.time)
    frame_count: int = 0
    last_frame_time: Optional[float] = None
    client_id: Optional[str] = None

    @property
    def duration_seconds(self) -> float:
        """Get session duration in seconds."""
        return time.time() - self.start_time

    @property
    def is_expired(self) -> bool:
        """Check if session has exceeded max duration."""
        from app.core.config import settings
        return self.duration_seconds > settings.MAX_SESSION_DURATION_SECONDS


class SessionManager:
    """Manages active WebSocket sessions."""

    def __init__(self):
        self.sessions: Dict[str, SessionInfo] = {}
        self.daily_usage: Dict[str, float] = {}  # client_id -> total seconds today

    def create_session(
        self,
        session_id: str,
        genre: Genre,
        client_id: Optional[str] = None
    ) -> SessionInfo:
        """
        Create a new session.

        Args:
            session_id: Unique session identifier
            genre: Commentary genre
            client_id: Optional client identifier for usage tracking

        Returns:
            SessionInfo object

        Raises:
            ValueError: If session already exists or daily limit exceeded
        """
        if session_id in self.sessions:
            raise ValueError(f"Session {session_id} already exists")

        # Check daily usage limit if client_id provided
        if client_id:
            from app.core.config import settings
            daily_usage = self.daily_usage.get(client_id, 0.0)
            if daily_usage >= settings.MAX_DAILY_USAGE_SECONDS:
                raise ValueError(
                    f"Client {client_id} has exceeded daily usage limit "
                    f"({daily_usage:.0f}/{settings.MAX_DAILY_USAGE_SECONDS} seconds)"
                )

        session = SessionInfo(
            session_id=session_id,
            genre=genre,
            client_id=client_id
        )

        self.sessions[session_id] = session
        logger.info(
            f"Created session {session_id} with genre {genre}"
            + (f" for client {client_id}" if client_id else "")
        )

        return session

    def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """Get session by ID."""
        return self.sessions.get(session_id)

    def update_frame_count(self, session_id: str):
        """Increment frame count for a session."""
        session = self.sessions.get(session_id)
        if session:
            session.frame_count += 1
            session.last_frame_time = time.time()
            logger.debug(f"Session {session_id} frame count: {session.frame_count}")

    def change_genre(self, session_id: str, new_genre: Genre):
        """Change the genre for a session."""
        session = self.sessions.get(session_id)
        if session:
            old_genre = session.genre
            session.genre = new_genre
            logger.info(f"Session {session_id} changed genre from {old_genre} to {new_genre}")

    def end_session(self, session_id: str) -> Optional[SessionInfo]:
        """
        End a session and update daily usage.

        Args:
            session_id: Session to end

        Returns:
            SessionInfo if session existed, None otherwise
        """
        session = self.sessions.pop(session_id, None)

        if session:
            duration = session.duration_seconds

            # Update daily usage
            if session.client_id:
                self.daily_usage[session.client_id] = (
                    self.daily_usage.get(session.client_id, 0.0) + duration
                )

            logger.info(
                f"Ended session {session_id}: "
                f"duration={duration:.1f}s, frames={session.frame_count}, "
                f"genre={session.genre}"
            )

        return session

    def cleanup_expired_sessions(self):
        """Remove sessions that have exceeded max duration."""
        expired = [
            sid for sid, session in self.sessions.items()
            if session.is_expired
        ]

        for session_id in expired:
            logger.warning(f"Cleaning up expired session: {session_id}")
            self.end_session(session_id)

        return len(expired)

    def get_active_session_count(self) -> int:
        """Get number of active sessions."""
        return len(self.sessions)

    def get_session_stats(self, session_id: str) -> Optional[dict]:
        """Get statistics for a session."""
        session = self.sessions.get(session_id)

        if not session:
            return None

        return {
            "session_id": session_id,
            "genre": session.genre,
            "duration_seconds": session.duration_seconds,
            "frame_count": session.frame_count,
            "frames_per_second": (
                session.frame_count / session.duration_seconds
                if session.duration_seconds > 0 else 0
            ),
            "client_id": session.client_id,
        }

    def get_daily_usage(self, client_id: str) -> float:
        """Get total usage in seconds for a client today."""
        return self.daily_usage.get(client_id, 0.0)

    def reset_daily_usage(self):
        """Reset daily usage counters (should be called daily)."""
        logger.info(f"Resetting daily usage for {len(self.daily_usage)} clients")
        self.daily_usage.clear()


# Global session manager instance
session_manager = SessionManager()
