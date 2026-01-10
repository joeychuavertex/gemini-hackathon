/**
 * WebSocket client for communicating with The Reality Remix backend
 */
import {
  Genre,
  WebSocketMessageType,
  ConnectionStatus,
} from "../types/index";

import type {
  SessionStartMessage,
  FrameMessage,
  GenreChangeMessage,
  SessionStopMessage,
  MusicToggleMessage,
  ServerMessage,
} from "../types/index";

export type MessageHandler = (message: ServerMessage) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus) => void;

// Determine WebSocket URL based on environment
function getDefaultWebSocketUrl(): string {
  // Check for environment variable first (set in Vercel)
  const envUrl = import.meta.env.VITE_WEBSOCKET_URL;
  if (envUrl) {
    console.log('🔌 Using VITE_WEBSOCKET_URL:', envUrl);
    return envUrl;
  }
  
  // In production (not localhost), check for backend URL
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws/reality-remix';
      console.log('🔌 Using VITE_BACKEND_URL:', wsUrl);
      return wsUrl;
    }
    
    // No backend URL configured - this will fail but show a clear error
    console.error('❌ No backend URL configured! Set VITE_WEBSOCKET_URL or VITE_BACKEND_URL in Vercel environment variables.');
    console.error('❌ The Python backend needs to be deployed separately (e.g., Railway, Render, Cloud Run).');
    // Return a placeholder that will fail with a clear message
    return "wss://backend-not-configured.invalid/ws/reality-remix";
  }
  
  // Default to localhost for development
  return "ws://localhost:8000/ws/reality-remix";
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimeout: number | null = null;

  constructor(url: string = getDefaultWebSocketUrl()) {
    this.url = url;
    console.log('🔌 WebSocket URL:', this.url);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.updateStatus(ConnectionStatus.CONNECTING);

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.updateStatus(ConnectionStatus.CONNECTED);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            console.log("📥 [BACKEND→FRONTEND] Received message:", message.type, message);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.updateStatus(ConnectionStatus.ERROR);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket closed");
          this.updateStatus(ConnectionStatus.DISCONNECTED);
          this.attemptReconnect();
        };
      } catch (error) {
        this.updateStatus(ConnectionStatus.ERROR);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus(ConnectionStatus.DISCONNECTED);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  sendSessionStart(genre: Genre, fps: number = 1.0, enableMusic: boolean = true) {
    const message: SessionStartMessage = {
      type: WebSocketMessageType.SESSION_START,
      genre,
      fps,
      enable_music: enableMusic,
    };

    console.log("📤 [FRONTEND→BACKEND] SESSION_START:", { genre, fps });
    this.send(message);
  }

  sendFrame(base64Jpeg: string, timestamp: number) {
    const message: FrameMessage = {
      type: WebSocketMessageType.FRAME,
      data: base64Jpeg,
      timestamp,
    };

    console.log("📤 [FRONTEND→BACKEND] FRAME:", { size: base64Jpeg.length, timestamp });
    this.send(message);
  }

  sendGenreChange(genre: Genre) {
    const message: GenreChangeMessage = {
      type: WebSocketMessageType.GENRE_CHANGE,
      genre,
    };

    console.log("📤 [FRONTEND→BACKEND] GENRE_CHANGE:", genre);
    this.send(message);
  }

  sendSessionStop() {
    const message: SessionStopMessage = {
      type: WebSocketMessageType.SESSION_STOP,
    };

    console.log("📤 [FRONTEND→BACKEND] SESSION_STOP");
    this.send(message);
  }

  sendMusicToggle(enabled: boolean) {
    const message: MusicToggleMessage = {
      type: WebSocketMessageType.MUSIC_TOGGLE,
      enabled,
    };

    this.send(message);
  }

  private send(message: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected, cannot send message");
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatusChange(handler: ConnectionStatusHandler) {
    this.statusHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private handleMessage(message: ServerMessage) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("Error in message handler:", error);
      }
    });
  }

  private updateStatus(status: ConnectionStatus) {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (error) {
        console.error("Error in status handler:", error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
