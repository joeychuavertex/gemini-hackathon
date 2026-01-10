/**
 * Camera view component with live video preview
 */
import { useEffect, useImperativeHandle, forwardRef } from "react";
import { useCamera } from "../hooks/useCamera";
import "../styles/CameraView.css";

interface CameraViewProps {
  onVideoReady?: (videoElement: HTMLVideoElement) => void;
  onError?: (error: string) => void;
  onStartSession?: () => void;
  onStopSession?: () => void;
  isSessionActive?: boolean;
  genre?: string | null;
}

export interface CameraViewRef {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isActive: boolean;
}

export const CameraView = forwardRef<CameraViewRef, CameraViewProps>(
  ({ onVideoReady, onError, onStartSession, onStopSession, isSessionActive, genre }, ref) => {
    const { videoRef, error, isActive, startCamera, stopCamera } = useCamera();

    // Expose camera controls to parent component
    useImperativeHandle(ref, () => ({
      startCamera,
      stopCamera,
      isActive,
    }));

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

        {/* Action button overlay */}
        <div className={`camera-action-button ${!isActive && !error ? 'centered' : ''}`}>
          {!isSessionActive ? (
            <button
              onClick={onStartSession}
              disabled={!genre}
              className="primary-btn start-btn"
            >
              🎬 Start Camera & Commentary
            </button>
          ) : (
            <button onClick={onStopSession} className="primary-btn stop-btn">
              ⏹️ Stop Camera & Commentary
            </button>
          )}
        </div>
      </div>
    );
  }
);

CameraView.displayName = "CameraView";
