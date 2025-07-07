
import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioVisualizer = (stream: MediaStream | null) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number>();

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average audio level
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;
    const normalizedLevel = Math.min(100, (average / 255) * 100);
    
    setAudioLevel(normalizedLevel);
    setIsActive(normalizedLevel > 5); // Consider active if above threshold
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  useEffect(() => {
    if (!stream) {
      setAudioLevel(0);
      setIsActive(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setAudioLevel(0);
      setIsActive(false);
      return;
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      source.connect(analyser);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      updateAudioLevel();
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        audioContext.close();
      };
    } catch (error) {
      console.error('Error setting up audio visualizer:', error);
      setAudioLevel(0);
      setIsActive(false);
    }
  }, [stream, updateAudioLevel]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { audioLevel, isActive };
};
