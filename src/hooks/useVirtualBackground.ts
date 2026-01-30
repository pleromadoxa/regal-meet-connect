
import { useEffect, useRef, useState, useCallback } from 'react';

export type BackgroundEffect = 'none' | 'blur' | 'image';

interface UseVirtualBackgroundProps {
  stream: MediaStream | null;
  effect: BackgroundEffect;
  backgroundImageUrl?: string;
  blurRadius?: number;
}

interface SegmentationResults {
  image: ImageBitmap | HTMLVideoElement | HTMLCanvasElement;
  segmentationMask: ImageBitmap | HTMLVideoElement | HTMLCanvasElement;
}

export const useVirtualBackground = ({
  stream,
  effect,
  backgroundImageUrl,
  blurRadius = 10
}: UseVirtualBackgroundProps) => {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmentationRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const onResultsOptimizedRef = useRef<(results: SegmentationResults) => void>(() => {});

  // Load background image
  useEffect(() => {
    if (effect === 'image' && backgroundImageUrl) {
      const img = new Image();
      img.src = backgroundImageUrl;
      img.onload = () => { bgImageRef.current = img; };
    }
  }, [effect, backgroundImageUrl]);

  // Define optimized callback
  const onResultsOptimized = useCallback((results: SegmentationResults) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Use width/height from the results image (Video/ImageBitmap)
    const width = (results.image as any).width;
    const height = (results.image as any).height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (effect === 'blur') {
      // Draw segmentation mask
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

      // Draw person (Keep where mask is opaque)
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Draw blurred background (Where mask is transparent)
      ctx.globalCompositeOperation = 'destination-over';
      ctx.filter = `blur(${blurRadius}px)`;
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    } else if (effect === 'image') {
       // Draw segmentation mask
       ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

       // Draw person
       ctx.globalCompositeOperation = 'source-in';
       ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

       // Draw background image
       ctx.globalCompositeOperation = 'destination-over';
       if (bgImageRef.current) {
         ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
       } else {
         ctx.fillStyle = '#333';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
       }
    } else {
       ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }, [effect, blurRadius]);

  // Handle onResults callback update
  useEffect(() => {
    onResultsOptimizedRef.current = onResultsOptimized;
  }, [onResultsOptimized]);

  // Initialize MediaPipe via CDN script
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.SelfieSegmentation) {
        setIsMediaPipeReady(true);
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
        console.log('MediaPipe script loaded');
        setIsMediaPipeReady(true);
    };
    script.onerror = (e) => {
        console.error('Failed to load MediaPipe script', e);
        // Fallback or retry?
    };
    document.body.appendChild(script);

    return () => {
        // Cleanup script tag if needed, but keeping it is usually fine
    };
  }, []);

  useEffect(() => {
    if (!isMediaPipeReady || segmentationRef.current) return;

    try {
        if (!window.SelfieSegmentation) {
            console.error('SelfieSegmentation not found on window despite script load');
            return;
        }

        console.log('Initializing SelfieSegmentation instance');
        const selfieSegmentation = new window.SelfieSegmentation({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        selfieSegmentation.setOptions({
            modelSelection: 1,
            selfieMode: false,
        });

        selfieSegmentation.onResults((results: any) => {
             if (onResultsOptimizedRef.current) {
                 onResultsOptimizedRef.current(results as unknown as SegmentationResults);
             }
        });

        segmentationRef.current = selfieSegmentation;

        // Create hidden video
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoRef.current = video;

        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
    } catch (error) {
        console.error('Error initializing SelfieSegmentation:', error);
    }

    return () => {
        if (segmentationRef.current) {
            try {
                segmentationRef.current.close();
            } catch (e) {
                console.error('Error closing segmentation', e);
            }
            segmentationRef.current = null;
        }
    };
  }, [isMediaPipeReady]);

  // Processing loop
  useEffect(() => {
    let isActive = true;

    const processFrame = async () => {
      if (!isActive) return;
      if (!stream || !segmentationRef.current || !videoRef.current) return;

      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.error("Error playing video for segmentation", e));
      }

      if (videoRef.current.readyState === 4) {
          try {
            await segmentationRef.current.send({ image: videoRef.current });
          } catch(e) {
            console.error("Segmentation processing error", e);
          }
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    if (stream && effect !== 'none' && isMediaPipeReady) {
      processFrame();
    } else if (stream && effect === 'none') {
        setProcessedStream(stream);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      isActive = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stream, effect, isMediaPipeReady]);

  // Capture canvas stream
  useEffect(() => {
    if (effect !== 'none' && canvasRef.current) {
      // Some browsers throw if captureStream is called on an empty canvas
      try {
          // Ensure canvas has content?
          const canvasStream = canvasRef.current.captureStream(30);
          setProcessedStream(canvasStream);
      } catch (e) {
          console.error("Error capturing canvas stream", e);
      }
    }
  }, [effect]);

  return processedStream;
};
