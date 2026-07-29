import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeakingDetectionOptions {
  threshold: number;
  smoothingTimeConstant: number;
  minSpeakingTime: number;
  maxSilenceTime: number;
}

export const useSpeakingDetection = (
  audioStream: MediaStream | null,
  options: Partial<SpeakingDetectionOptions> = {}
) => {
  const {
    threshold = 0.01,
    smoothingTimeConstant = 0.8,
    minSpeakingTime = 300,
    maxSilenceTime = 1000
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingTimeRef = useRef<number>(0);
  const lastSpeakingTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyzerRef.current) {
      analyzerRef.current.disconnect();
      analyzerRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const detectSpeaking = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedVolume = average / 255;

    const currentTime = Date.now();
    const isCurrentlySpeaking = normalizedVolume > threshold;

    if (isCurrentlySpeaking) {
      if (!isSpeaking && speakingTimeRef.current === 0) {
        speakingTimeRef.current = currentTime;
      } else if (speakingTimeRef.current > 0 && currentTime - speakingTimeRef.current > minSpeakingTime) {
        if (!isSpeaking) {
          setIsSpeaking(true);
          lastSpeakingTimeRef.current = currentTime;
        }
      }
    } else {
      if (isSpeaking) {
        if (currentTime - lastSpeakingTimeRef.current > maxSilenceTime) {
          setIsSpeaking(false);
          speakingTimeRef.current = 0;
        }
      } else {
        speakingTimeRef.current = 0;
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectSpeaking);
  }, [threshold, isSpeaking, minSpeakingTime, maxSilenceTime]);

  useEffect(() => {
    if (!audioStream) {
      cleanup();
      setIsSpeaking(false);
      return;
    }

    const audioTracks = audioStream.getAudioTracks();
    if (audioTracks.length === 0) {
      cleanup();
      setIsSpeaking(false);
      return;
    }

    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create analyzer
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = smoothingTimeConstant;
      analyzerRef.current = analyzer;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(audioStream);
      sourceRef.current = source;

      // Connect source to analyzer
      source.connect(analyzer);

      // Start detection
      detectSpeaking();

      console.log('Speaking detection initialized');
    } catch (error) {
      console.error('Error setting up speaking detection:', error);
      cleanup();
      setIsSpeaking(false);
    }

    return cleanup;
  }, [audioStream, smoothingTimeConstant, detectSpeaking, cleanup]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isSpeaking,
    cleanup
  };
};

// Hook for managing speaking detection for multiple participants
export const useMultiParticipantSpeakingDetection = () => {
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const detectorsRef = useRef<Map<string, { cleanup: () => void }>>(new Map());

  const addParticipant = useCallback((participantId: string, audioStream: MediaStream | null) => {
    // Remove existing detector if any
    removeParticipant(participantId);

    if (!audioStream) return;

    // Create new detector for this participant
    let isSpeaking = false;
    let audioContext: AudioContext | null = null;
    let analyzer: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrame: number | null = null;

    const detectSpeaking = () => {
      if (!analyzer) return;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedVolume = average / 255;
      const isCurrentlySpeaking = normalizedVolume > 0.01;

      if (isCurrentlySpeaking !== isSpeaking) {
        isSpeaking = isCurrentlySpeaking;
        
        setSpeakingParticipants(prev => {
          const newSet = new Set(prev);
          if (isSpeaking) {
            newSet.add(participantId);
          } else {
            newSet.delete(participantId);
          }
          return newSet;
        });
      }

      animationFrame = requestAnimationFrame(detectSpeaking);
    };

    const cleanup = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      if (source) {
        source.disconnect();
        source = null;
      }
      if (analyzer) {
        analyzer.disconnect();
        analyzer = null;
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
      }
      
      // Remove from speaking participants
      setSpeakingParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(participantId);
        return newSet;
      });
    };

    try {
      audioContext = new AudioContext();
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;

      source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyzer);

      detectSpeaking();

      detectorsRef.current.set(participantId, { cleanup });
      console.log('Speaking detection added for participant:', participantId);
    } catch (error) {
      console.error('Error setting up speaking detection for participant:', participantId, error);
      cleanup();
    }
  }, []);

  const removeParticipant = useCallback((participantId: string) => {
    const detector = detectorsRef.current.get(participantId);
    if (detector) {
      detector.cleanup();
      detectorsRef.current.delete(participantId);
      console.log('Speaking detection removed for participant:', participantId);
    }
  }, []);

  const cleanup = useCallback(() => {
    detectorsRef.current.forEach(detector => detector.cleanup());
    detectorsRef.current.clear();
    setSpeakingParticipants(new Set());
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    speakingParticipants,
    addParticipant,
    removeParticipant,
    cleanup
  };
};