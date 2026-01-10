/**
 * Hook for managing background music stream playback
 * Handles raw PCM audio from Lyria RealTime API (48kHz stereo PCM16)
 */
import { useState, useRef, useCallback, useEffect } from "react";

// Lyria RealTime outputs 48kHz stereo PCM audio
const LYRIA_SAMPLE_RATE = 48000;
const LYRIA_CHANNELS = 2; // Stereo

export const useMusicStream = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3); // Lower default volume for background music

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingBufferRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Initialize Web Audio API
  useEffect(() => {
    // Use Lyria's native sample rate
    audioContextRef.current = new AudioContext({ sampleRate: LYRIA_SAMPLE_RATE });
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
      setIsPlaying(false);
      return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = nextBuffer;
    source.connect(gainNodeRef.current);

    source.onended = () => {
      playNextBuffer();
    };

    // Schedule playback for seamless audio
    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + nextBuffer.duration;

    currentSourceRef.current = source;
    isPlayingBufferRef.current = true;
    setIsPlaying(true);
  }, []);

  const playMusicChunk = useCallback(
    async (base64Audio: string) => {
      if (!audioContextRef.current || !gainNodeRef.current) {
        console.warn("🎵 Audio context not initialized");
        return;
      }

      // Resume audio context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
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

        // Lyria sends PCM16 audio at 48kHz stereo
        // 2 bytes per sample, 2 channels = 4 bytes per frame
        const bytesPerSample = 2;
        const numFrames = Math.floor(len / (bytesPerSample * LYRIA_CHANNELS));

        console.log(`🎵 Processing ${numFrames} frames (${numFrames / LYRIA_SAMPLE_RATE}s) stereo audio`);

        // Create stereo audio buffer
        const audioBuffer = audioContextRef.current.createBuffer(
          LYRIA_CHANNELS,
          numFrames,
          LYRIA_SAMPLE_RATE
        );

        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);

        // Convert PCM16 to float32 (-1.0 to 1.0)
        // PCM16 is signed 16-bit little-endian, interleaved stereo (L R L R ...)
        for (let i = 0; i < numFrames; i++) {
          const offset = i * 4; // 4 bytes per frame (2 channels * 2 bytes)

          // Left channel
          const leftInt16 = bytes[offset] | (bytes[offset + 1] << 8);
          const leftSample = leftInt16 >= 0x8000 ? leftInt16 - 0x10000 : leftInt16;
          leftChannel[i] = leftSample / 32768.0;

          // Right channel
          const rightInt16 = bytes[offset + 2] | (bytes[offset + 3] << 8);
          const rightSample = rightInt16 >= 0x8000 ? rightInt16 - 0x10000 : rightInt16;
          rightChannel[i] = rightSample / 32768.0;
        }

        console.log(`🎵 Audio buffer created: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels`);

        // Add to queue
        audioQueueRef.current.push(audioBuffer);

        // Start playback if not already playing
        if (!isPlayingBufferRef.current) {
          console.log("🎵 Starting music playback");
          nextPlayTimeRef.current = audioContextRef.current.currentTime;
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

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      currentSourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = new AudioContext({ sampleRate: LYRIA_SAMPLE_RATE });
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
      nextPlayTimeRef.current = 0;
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
