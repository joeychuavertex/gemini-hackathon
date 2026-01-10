/**
 * Subtitles component with autoscroll functionality
 */
import { useEffect, useRef } from "react";
import "../styles/Subtitles.css";

interface SubtitlesProps {
  text: string;
  isActive: boolean;
}

export function Subtitles({ text, isActive }: SubtitlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Autoscroll when new text is added
  useEffect(() => {
    if (containerRef.current && textRef.current && text) {
      // Scroll to bottom smoothly
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [text]);

  if (!isActive || !text) {
    return null;
  }

  return (
    <div className="subtitles-container" ref={containerRef}>
      <div className="subtitles-content">
        <p className="subtitles-text" ref={textRef}>
          {text}
        </p>
      </div>
    </div>
  );
}

