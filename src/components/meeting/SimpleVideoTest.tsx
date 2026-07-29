import React, { useRef, useEffect, useState } from 'react';

interface SimpleVideoTestProps {
  stream: MediaStream | null;
  userName: string;
}

export const SimpleVideoTest = ({ stream, userName }: SimpleVideoTestProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      return;
    }


    const handleLoadedMetadata = () => {
      setIsLoaded(true);
      setError(null);
    };

    const handleError = (e: any) => {
      setError('Video load error');
    };

    const handleLoadStart = () => {};

    const handleCanPlay = () => {};

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    // Set the stream
    video.srcObject = stream;
    
    // Try to play
    video.play().then(() => {
      // Video playing successfully
    }).catch(err => {
      setError('Autoplay failed - click to play');
    });

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.srcObject = null;
    };
  }, [stream, userName]);

  if (!stream) {
    return (
      <div className="bg-red-500/20 p-4 rounded border border-red-500/40">
        <p className="text-red-300 text-sm">No stream provided</p>
      </div>
    );
  }

  const videoTracks = stream.getVideoTracks();
  const hasVideo = videoTracks.length > 0 && videoTracks[0].enabled;

  return (
    <div className="bg-slate-800 p-4 rounded border border-slate-600">
      <h3 className="text-white font-medium mb-2">Video Test: {userName}</h3>
      
      {error && <div className="text-xs text-red-400 mb-2">Error: {error}</div>}

      {/* Video element */}
      <div className="relative bg-slate-700 rounded aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded"
          style={{ 
            display: 'block',
            background: 'linear-gradient(45deg, #1e293b, #334155)' 
          }}
          onClick={(e) => {
            // Manual play on click if autoplay failed
            e.currentTarget.play().catch(console.error);
          }}
        />
        
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            Loading video...
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.play().catch(console.error);
                }
              }}
            >
              Click to Play
            </button>
          </div>
        )}
      </div>
    </div>
  );
};