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
  ServerMessage,
} from "../types/index";

export type MessageHandler = (message: ServerMessage) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimeout: number | null = null;

  constructor(url: string = "ws://localhost:8000/ws/reality-remix") {
    this.url = url;
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

  sendSessionStart(genre: Genre, fps: number = 1.0) {
    const message: SessionStartMessage = {
      type: WebSocketMessageType.SESSION_START,
      genre,
      fps,
    };

    this.send(message);
  }

  sendFrame(base64Jpeg: string, timestamp: number) {
    const message: FrameMessage = {
      type: WebSocketMessageType.FRAME,
      data: base64Jpeg,
      timestamp,
    };

    this.send(message);
  }

  sendGenreChange(genre: Genre) {
    const message: GenreChangeMessage = {
      type: WebSocketMessageType.GENRE_CHANGE,
      genre,
    };

    this.send(message);
  }

  sendSessionStop() {
    const message: SessionStopMessage = {
      type: WebSocketMessageType.SESSION_STOP,
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
