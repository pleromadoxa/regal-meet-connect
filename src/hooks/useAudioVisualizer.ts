import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioVisualizerData {
  volume: number;
  isActive: boolean;
  avgVolume: number;
}

export const useAudioVisualizer = (stream: MediaStream | null, isEnabled: boolean = true) => {
  const [audioData, setAudioData] = useState<AudioVisualizerData>({
    volume: 0,
    isActive: false,
    avgVolume: 0
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const volumeHistoryRef = useRef<number[]>([]);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const initAudioContext = useCallback(async () => {
    if (!stream || !isEnabled) return;

    try {
      // Clean up existing context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyser
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Connect stream to analyser
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      console.log('Audio context initialized for audio visualization');
      startAnalyzing();
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }, [stream, isEnabled]);

  const startAnalyzing = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const analyze = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i] * dataArrayRef.current[i];
      }
      
      const rms = Math.sqrt(sum / dataArrayRef.current.length);
      const volume = Math.round((rms / 255) * 100);
      
      // Keep volume history for averaging
      volumeHistoryRef.current.push(volume);
      if (volumeHistoryRef.current.length > 10) {
        volumeHistoryRef.current.shift();
      }
      
      const avgVolume = volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length;
      const isActive = avgVolume > 5; // Threshold for considering audio as active
      
      setAudioData({
        volume,
        isActive,
        avgVolume: Math.round(avgVolume)
      });

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, []);

  const stopAnalyzing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopAnalyzing();
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    volumeHistoryRef.current = [];
    
    setAudioData({
      volume: 0,
      isActive: false,
      avgVolume: 0
    });
  }, [stopAnalyzing]);

  useEffect(() => {
    if (stream && isEnabled) {
      initAudioContext();
    } else {
      cleanup();
    }

    return cleanup;
  }, [stream, isEnabled, initAudioContext, cleanup]);

  return {
    ...audioData,
    cleanup
  };
};
