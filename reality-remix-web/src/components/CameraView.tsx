/**
 * Camera view component with live video preview
 */
import { useEffect } from "react";
import { useCamera } from "../hooks/useCamera";
import "../styles/CameraView.css";

interface CameraViewProps {
  onVideoReady?: (videoElement: HTMLVideoElement) => void;
  onError?: (error: string) => void;
}

export function CameraView({ onVideoReady, onError }: CameraViewProps) {
  const { videoRef, error, isActive, startCamera, stopCamera } = useCamera();

  useEffect(() => {
    // Notify parent when video element is ready and has metadata
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      if (onVideoReady && isActive) {
        onVideoReady(videoElement);
      }
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoRef, isActive, onVideoReady]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <div className="camera-view">
      {!isActive && !error && (
        <div className="camera-placeholder">
          <div className="placeholder-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="camera-icon"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <button onClick={startCamera} className="start-camera-btn">
              Start Camera
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="camera-error">
          <div className="error-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="error-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <p className="error-message">{error}</p>
            <button onClick={startCamera} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`camera-video ${isActive ? "active" : "hidden"}`}
      />

      {isActive && (
        <div className="camera-controls">
          <button onClick={stopCamera} className="stop-btn">
            Stop Camera
          </button>
        </div>
      )}
    </div>
  );
}
