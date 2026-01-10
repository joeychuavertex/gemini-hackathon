/**
 * Hook for playing audio commentary using Web Audio API
 */
import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioStreamReturn {
  playAudioChunk: (base64Pcm: string) => Promise<void>;
  isPlaying: boolean;
  stop: () => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export function useAudioStream(): UseAudioStreamReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1.0);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // Initialize Audio Context
  useEffect(() => {
    // Create Audio Context (use webkitAudioContext for Safari compatibility)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) {
      console.error("Web Audio API not supported");
      return;
    }

    audioContextRef.current = new AudioContextClass();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    gainNodeRef.current.gain.value = volume;

    console.log("Audio context initialized");

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  const playAudioChunk = useCallback(async (base64Pcm: string) => {
    if (!audioContextRef.current || !gainNodeRef.current) {
      console.error("Audio context not initialized");
      return;
    }

    try {
      console.log("Received audio chunk, base64 length:", base64Pcm.length);

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Pcm);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log("Decoded bytes length:", bytes.length);

      // Gemini sends PCM16 audio at 24kHz
      // Convert PCM16 bytes to Float32 samples
      const sampleRate = 24000;
      const numSamples = bytes.length / 2; // 2 bytes per sample (PCM16)

      console.log("Number of samples:", numSamples, "Duration:", numSamples / sampleRate, "seconds");

      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        numSamples,
        sampleRate
      );

      const channelData = audioBuffer.getChannelData(0);

      // Convert PCM16 to float32 (-1.0 to 1.0)
      // PCM16 is signed 16-bit little-endian
      for (let i = 0; i < numSamples; i++) {
        const int16 = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
        // Convert from unsigned to signed
        const sample = int16 >= 0x8000 ? int16 - 0x10000 : int16;
        channelData[i] = sample / 32768.0;
      }

      console.log("Audio context state:", audioContextRef.current.state);
      console.log("Sample range:", Math.min(...channelData), "to", Math.max(...channelData));

      // Create source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current);

      source.onended = () => {
        console.log("Audio chunk finished playing");
        // Remove from queue
        const index = audioQueueRef.current.indexOf(source);
        if (index > -1) {
          audioQueueRef.current.splice(index, 1);
        }

        // Update playing state
        if (audioQueueRef.current.length === 0) {
          setIsPlaying(false);
        }
      };

      // Resume audio context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === "suspended") {
        console.log("Audio context suspended, resuming...");
        await audioContextRef.current.resume();
        console.log("Audio context resumed, new state:", audioContextRef.current.state);
      }

      // Calculate when to play this chunk
      const currentTime = audioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      const duration = audioBuffer.duration;

      // Update next play time for sequential playback
      nextPlayTimeRef.current = startTime + duration;

      source.start(startTime);
      audioQueueRef.current.push(source);
      setIsPlaying(true);

      console.log(`✅ Playing audio chunk: ${numSamples} samples at ${sampleRate}Hz, startTime: ${startTime.toFixed(3)}s, duration: ${duration.toFixed(3)}s, volume: ${gainNodeRef.current.gain.value}`);
    } catch (error) {
      console.error("Error playing audio chunk:", error);
    }
  }, []);

  const stop = useCallback(() => {
    if (!audioContextRef.current) return;

    // Stop all playing sources immediately
    audioQueueRef.current.forEach((source) => {
      try {
        source.stop(0); // Stop immediately
      } catch (error) {
        // Source might already be stopped
      }
    });

    audioQueueRef.current = [];
    // Reset next play time to current time for immediate playback if restarted
    nextPlayTimeRef.current = audioContextRef.current.currentTime;
    setIsPlaying(false);

    console.log("Stopped audio playback");
  }, []);

  return {
    playAudioChunk,
    isPlaying,
    stop,
    volume,
    setVolume,
  };
}
