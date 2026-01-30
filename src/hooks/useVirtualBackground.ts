
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
  const scriptLoadedRef = useRef(false);

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

  // Initialize MediaPipe via CDN script
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      console.log('MediaPipe SelfieSegmentation script loaded');
      scriptLoadedRef.current = true;

      if (window.SelfieSegmentation) {
        const selfieSegmentation = new window.SelfieSegmentation({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        selfieSegmentation.setOptions({
          modelSelection: 1,
          selfieMode: false,
        });

        selfieSegmentation.onResults((results: any) => {
            // We need to access the latest callback from the ref or state,
            // but since onResultsOptimized depends on effect/blurRadius, we need to be careful.
            // For simplicity, we'll assume the segmentation instance persists and we just update the callback logic if we re-init?
            // Actually, best pattern is to store the callback in a ref?
            // Or just rely on the closure?
            // The issue is `onResultsOptimized` changes when `effect` changes.
            // We should assign the callback inside the effect that handles processing?
            // No, `onResults` is set once.
            // Let's use a ref for the callback.
        });

        segmentationRef.current = selfieSegmentation;
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script? Usually not needed for singleton lib, but good practice.
      // document.body.removeChild(script);
      if (segmentationRef.current) {
        segmentationRef.current.close();
      }
    };
  }, []);

  // Handle onResults callback update
  const onResultsOptimizedRef = useRef(onResultsOptimized);
  useEffect(() => {
    onResultsOptimizedRef.current = onResultsOptimized;
  }, [onResultsOptimized]);

  // Set the callback on the segmentation instance whenever it's ready
  useEffect(() => {
    if (segmentationRef.current) {
        segmentationRef.current.onResults((results: any) => {
            if (onResultsOptimizedRef.current) {
                onResultsOptimizedRef.current(results as unknown as SegmentationResults);
            }
        });
    }
  }, [segmentationRef.current]); // This might not trigger if ref changes deeply?
  // Actually segmentationRef is a Ref, changing .current won't trigger re-render.
  // But the script.onload sets it. We need to trigger a re-render or check it in the loop.
  // Better: Initialize segmentation inside the script onload and save to state?
  // Or just rely on the processing loop checking for existence.

  // Re-attach onResults if segmentation exists (e.g. after it loads)
  // We can poll or just trust the loop.
  // Actually, `onResults` must be registered for `send()` to work and callback to fire.

  // Revised Initialization Logic:
  // 1. Load script.
  // 2. Set state `isMediaPipeReady`.
  // 3. Effect on `isMediaPipeReady` -> create instance.

  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);

  useEffect(() => {
    if (window.SelfieSegmentation) {
        setIsMediaPipeReady(true);
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => setIsMediaPipeReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isMediaPipeReady || segmentationRef.current) return;

    console.log('Initializing SelfieSegmentation instance');
    const selfieSegmentation = new window.SelfieSegmentation({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: false,
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

    return () => {
        selfieSegmentation.close();
    };
  }, [isMediaPipeReady]);

  // Update onResults callback
  useEffect(() => {
      if (segmentationRef.current) {
          segmentationRef.current.onResults((results: any) => {
              onResultsOptimizedRef.current(results as unknown as SegmentationResults);
          });
      }
  }, [isMediaPipeReady, segmentationRef.current]); // Trigger when ready

  // Processing loop
  useEffect(() => {
    const processFrame = async () => {
      if (!stream || !segmentationRef.current || !videoRef.current) return;

      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.error("Error playing video for segmentation", e));
      }

      if (videoRef.current.readyState === 4) {
          try {
            await segmentationRef.current.send({ image: videoRef.current });
          } catch(e) {
            console.error("Segmentation error", e);
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stream, effect, isMediaPipeReady]);

  // Capture canvas stream
  useEffect(() => {
    if (effect !== 'none' && canvasRef.current) {
      const canvasStream = canvasRef.current.captureStream(30);
      setProcessedStream(canvasStream);
    }
  }, [effect]);

  return processedStream;
};
