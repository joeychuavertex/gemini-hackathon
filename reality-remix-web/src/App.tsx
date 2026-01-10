/**
 * The Reality Remix - Main Application Component
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { CameraView } from "./components/CameraView";
import { GenreSelector } from "./components/GenreSelector";
import { Subtitles } from "./components/Subtitles";
import { useFrameCapture } from "./hooks/useFrameCapture";
import { useAudioStream } from "./hooks/useAudioStream";
import { WebSocketClient } from "./services/websocket-client";
import {
  Genre,
  ConnectionStatus,
  WebSocketMessageType,
} from "./types/index";
import type { ServerMessage } from "./types/index";
import "./App.css";

function App() {
  const [genre, setGenre] = useState<Genre | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [subtitleText, setSubtitleText] = useState<string>("");
  const subtitleHistoryRef = useRef<string[]>([]);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const { playAudioChunk, isPlaying, volume, setVolume, stop: stopAudio } = useAudioStream();
  const lastCommentaryTimeRef = useRef<number>(0);
  const canSendFrameRef = useRef<boolean>(true);

  // Handle frame capture with cooldown
  const handleFrameCapture = useCallback(
    (base64Jpeg: string, timestamp: number) => {
      if (!wsClientRef.current || !isSessionActive) return;

      // Check if we can send a frame (cooldown logic)
      const now = Date.now();
      const timeSinceLastCommentary = now - lastCommentaryTimeRef.current;
      const COOLDOWN_MS = 50; // 0.5 second cooldown after turn complete

      // Allow sending if:
      // 1. canSendFrame is true (no active commentary)
      // 2. Enough time has passed since last commentary (cooldown)
      if (canSendFrameRef.current && timeSinceLastCommentary > COOLDOWN_MS) {
        wsClientRef.current.sendFrame(base64Jpeg, timestamp);
        canSendFrameRef.current = false; // Block until turn complete
        console.log("📸 Frame sent to Gemini");
      } else {
        console.log("⏳ Skipping frame (waiting for commentary to complete)");
      }
    },
    [isSessionActive]
  );

  const { stopCapture } = useFrameCapture({
    videoElement,
    fps: 0.8, // 0.8 FPS = 1 frame every 1.25 seconds for better quality
    quality: 0.75, // Higher quality for better analysis
    onFrame: handleFrameCapture,
    enabled: isSessionActive && videoElement !== null,
  });

  // Initialize WebSocket client
  useEffect(() => {
    wsClientRef.current = new WebSocketClient();

    const unsubscribeStatus = wsClientRef.current.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    const unsubscribeMessage = wsClientRef.current.onMessage((message: ServerMessage) => {
      handleServerMessage(message);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();

      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, []);

  const handleServerMessage = (message: ServerMessage) => {
    console.log("📥 [FRONTEND] Handling message:", message.type, message);
    
    switch (message.type) {
      case WebSocketMessageType.AUDIO_CHUNK:
        console.log("📥 [FRONTEND] Processing AUDIO_CHUNK:", { size: message.data.length, timestamp: message.timestamp });
        playAudioChunk(message.data);
        break;

      case WebSocketMessageType.TRANSCRIPTION:
        console.log("📥 [FRONTEND] Processing TRANSCRIPTION:", { text: message.text, timestamp: message.timestamp });
        // Accumulate transcription text
        if (message.text.trim()) {
          subtitleHistoryRef.current.push(message.text);
          setSubtitleText(subtitleHistoryRef.current.join(" "));
        }
        break;

      case WebSocketMessageType.TURN_COMPLETE:
        console.log("📥 [FRONTEND] Processing TURN_COMPLETE - ready for next frame");
        // Enable sending new frames after cooldown
        lastCommentaryTimeRef.current = Date.now();
        canSendFrameRef.current = true;
        break;

      case WebSocketMessageType.ERROR:
        console.error("📥 [FRONTEND] Processing ERROR:", message.message, message.code);
        setError(message.message);
        canSendFrameRef.current = true; // Allow retry on error
        break;

      default:
        console.log("📥 [FRONTEND] Unknown message type:", message);
    }
  };

  const handleGenreSelect = async (selectedGenre: Genre) => {
    if (!wsClientRef.current) return;

    // If session is active and genre is different, change genre
    if (isSessionActive && selectedGenre !== genre) {
      wsClientRef.current.sendGenreChange(selectedGenre);
      setGenre(selectedGenre);
      return;
    }

    // Otherwise, start new session
    setGenre(selectedGenre);
  };

  const startSession = async () => {
    if (!wsClientRef.current || !genre || !videoElement) {
      setError("Please select a genre and enable camera first");
      return;
    }

    try {
      setError(null);

      // Connect to WebSocket
      await wsClientRef.current.connect();

      // Send session start message
      wsClientRef.current.sendSessionStart(genre, 1.0);

      setIsSessionActive(true);

      console.log("Session started with genre:", genre);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start session";
      setError(errorMsg);
      console.error("Error starting session:", err);
    }
  };

  const stopSession = () => {
    if (wsClientRef.current) {
      wsClientRef.current.sendSessionStop();
      wsClientRef.current.disconnect();
    }

    stopCapture();
    stopAudio(); // Stop audio immediately
  setIsSessionActive(false);
    canSendFrameRef.current = true;
    lastCommentaryTimeRef.current = 0;
    setSubtitleText(""); // Clear subtitles when session stops
    subtitleHistoryRef.current = []; // Clear history

    console.log("Session stopped");
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTING:
        return "Connecting...";
      case ConnectionStatus.CONNECTED:
        return isSessionActive ? "Live" : "Connected";
      case ConnectionStatus.DISCONNECTED:
        return "Disconnected";
      case ConnectionStatus.ERROR:
        return "Connection Error";
      default:
        return "";
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🎬</span>
          The Reality Remix
        </h1>
        <p className="app-subtitle">
          Turn everyday life into instant entertainment
        </p>
      </header>

      <div className="genre-section">
        <GenreSelector
          selectedGenre={genre}
          onSelectGenre={handleGenreSelect}
          disabled={false}
        />
      </div>

      <main className="app-main">
        <div className="video-section">
          <CameraView
            onVideoReady={setVideoElement}
            onError={(err) => setError(err)}
          />

          {/* Status indicator */}
          <div className={`status-indicator ${connectionStatus}`}>
            <div className="status-dot"></div>
            <span className="status-text">{getStatusText()}</span>
            {isPlaying && <span className="status-badge">🔊 Playing</span>}
          </div>

          {/* Volume control */}
          {isSessionActive && (
            <div className="volume-control">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="volume-slider"
              />
              <span className="volume-value">{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>

        <div className="controls-section">
          {error && <div className="error-banner">{error}</div>}

          <div className="action-buttons">
            {!isSessionActive ? (
              <button
                onClick={startSession}
                disabled={!genre || !videoElement}
                className="primary-btn start-btn"
              >
                🎭 Start Commentary
              </button>
            ) : (
              <button onClick={stopSession} className="primary-btn stop-btn">
                ⏹️ Stop Commentary
              </button>
            )}
          </div>

          {genre && (
            <div className="current-genre">
              <p className="current-genre-label">Current Genre:</p>
              <p className="current-genre-name">
                {genre.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
              </p>
            </div>
          )}
        </div>

        {/* Subtitles box */}
        {isSessionActive && (
          <div className="subtitles-section">
            <Subtitles text={subtitleText} isActive={isSessionActive} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Gemini 2.0 Flash</p>
      </footer>
    </div>
  );
}

export default App;
