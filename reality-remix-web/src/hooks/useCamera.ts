/**
 * Hook for accessing device camera via MediaStream API
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface UseCameraOptions {
  autoStart?: boolean;
  videoConstraints?: MediaTrackConstraints;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  error: string | null;
  isActive: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    autoStart = false,
    videoConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    },
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      setStream(mediaStream);
      setIsActive(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      console.log("Camera started successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";

      setError(errorMessage);
      setIsActive(false);

      console.error("Camera error:", err);

      // Provide user-friendly error messages
      if (errorMessage.includes("Permission denied")) {
        setError(
          "Camera access denied. Please allow camera permissions in your browser settings."
        );
      } else if (errorMessage.includes("not found")) {
        setError("No camera found. Please connect a camera and try again.");
      } else {
        setError(`Camera error: ${errorMessage}`);
      }
    }
  }, [videoConstraints]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsActive(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      console.log("Camera stopped");
    }
  }, [stream]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [autoStart]); // Only run on mount/unmount

  return {
    videoRef,
    stream,
    error,
    isActive,
    startCamera,
    stopCamera,
  };
}
