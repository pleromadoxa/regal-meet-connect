
import { useEffect, useRef, useState, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

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
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  const animationFrameRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

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

  // Initialize MediaPipe
  useEffect(() => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
      modelSelection: 1,
      selfieMode: false,
    });

    selfieSegmentation.onResults((results) => onResultsOptimized(results as unknown as SegmentationResults));
    segmentationRef.current = selfieSegmentation;

    // Create a hidden video element
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (segmentationRef.current) segmentationRef.current.close();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [onResultsOptimized]);

  // Processing loop
  useEffect(() => {
    const processFrame = async () => {
      if (!stream || !segmentationRef.current || !videoRef.current) return;

      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.error("Error playing video for segmentation", e));
      }

      if (videoRef.current.readyState === 4) { // HAVE_ENOUGH_DATA
          try {
            await segmentationRef.current.send({ image: videoRef.current });
          } catch(e) {
            console.error("Segmentation error", e);
          }
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    if (stream && effect !== 'none') {
      processFrame();
    } else if (stream && effect === 'none') {
        setProcessedStream(stream);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [stream, effect]);

  // Capture canvas stream
  useEffect(() => {
    if (effect !== 'none' && canvasRef.current) {
      const canvasStream = canvasRef.current.captureStream(30);
      setProcessedStream(canvasStream);
    }
  }, [effect]);

  return processedStream;
};
