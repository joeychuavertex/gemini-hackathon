/**
 * Hook for managing background music stream playback
 */
import { useState, useRef, useCallback, useEffect } from "react";

export const useMusicStream = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3); // Lower default volume for background music

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingBufferRef = useRef(false);

  // Initialize Web Audio API
  useEffect(() => {
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    gainNodeRef.current.gain.value = volume;

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  const playNextBuffer = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    const nextBuffer = audioQueueRef.current.shift();
    if (!nextBuffer) {
      isPlayingBufferRef.current = false;
      return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = nextBuffer;
    source.connect(gainNodeRef.current);

    source.onended = () => {
      playNextBuffer();
    };

    source.start();
    isPlayingBufferRef.current = true;
    setIsPlaying(true);
  }, []);

  const playMusicChunk = useCallback(
    async (base64Audio: string) => {
      if (!audioContextRef.current) {
        console.warn("🎵 Audio context not initialized");
        return;
      }

      try {
        console.log(`🎵 Received music chunk: ${base64Audio.length} chars`);

        // Decode base64 to ArrayBuffer
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log(`🎵 Decoded ${len} bytes of audio data`);

        // Decode audio data
        const audioBuffer = await audioContextRef.current.decodeAudioData(
          bytes.buffer
        );

        console.log(`🎵 Audio buffer decoded: ${audioBuffer.duration}s, ${audioBuffer.numberOfChannels} channels`);

        // Add to queue
        audioQueueRef.current.push(audioBuffer);

        // Start playback if not already playing
        if (!isPlayingBufferRef.current) {
          console.log("🎵 Starting music playback");
          playNextBuffer();
        }
      } catch (error) {
        console.error("🎵 Error playing music chunk:", error);
      }
    },
    [playNextBuffer]
  );

  const stop = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingBufferRef.current = false;
    setIsPlaying(false);

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  return {
    playMusicChunk,
    isPlaying,
    volume,
    setVolume,
    stop,
  };
};
