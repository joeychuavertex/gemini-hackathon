/**
 * Hook for capturing frames from video stream at specified FPS
 */
import { useEffect, useRef, useCallback } from "react";

interface UseFrameCaptureOptions {
  videoElement: HTMLVideoElement | null;
  fps?: number;
  quality?: number;
  onFrame?: (base64Jpeg: string, timestamp: number) => void;
  enabled?: boolean;
}

export function useFrameCapture({
  videoElement,
  fps = 1.0,
  quality = 0.7,
  onFrame,
  enabled = false,
}: UseFrameCaptureOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const captureFrame = useCallback(() => {
    if (!videoElement || !canvasRef.current) {
      return null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    // Set canvas size to match video
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (width === 0 || height === 0) {
      return null;
    }

    canvas.width = width;
    canvas.height = height;

    // Draw current video frame to canvas
    ctx.drawImage(videoElement, 0, 0, width, height);

    // Convert to JPEG blob
    try {
      const base64Data = canvas.toDataURL("image/jpeg", quality);

      // Remove the "data:image/jpeg;base64," prefix
      const base64Jpeg = base64Data.split(",")[1];

      return base64Jpeg;
    } catch (error) {
      console.error("Error capturing frame:", error);
      return null;
    }
  }, [videoElement, quality]);

  const startCapture = useCallback(() => {
    if (intervalRef.current !== null) {
      return; // Already capturing
    }

    const intervalMs = 1000 / fps;

    intervalRef.current = window.setInterval(() => {
      const frame = captureFrame();

      if (frame && onFrame) {
        const timestamp = Date.now();
        onFrame(frame, timestamp);
      }
    }, intervalMs);

    console.log(`Started frame capture at ${fps} FPS`);
  }, [fps, captureFrame, onFrame]);

  const stopCapture = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("Stopped frame capture");
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  // Start/stop capture based on enabled state
  useEffect(() => {
    if (enabled && videoElement) {
      startCapture();
    } else {
      stopCapture();
    }

    return () => {
      stopCapture();
    };
  }, [enabled, videoElement, startCapture, stopCapture]);

  return {
    captureFrame,
    startCapture,
    stopCapture,
  };
}
