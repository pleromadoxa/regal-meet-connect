
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface AudioIndicatorProps {
  stream: MediaStream | null;
  className?: string;
}

export const AudioIndicator = ({ stream, className = "" }: AudioIndicatorProps) => {
  const { volume, isActive, avgVolume } = useAudioVisualizer(stream);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex space-x-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isActive && volume > (i + 1) * 15 
                ? 'h-4 bg-green-400' 
                : 'h-1 bg-gray-600'
            }`}
          />
        ))}
      </div>
      {isActive && (
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}
    </div>
  );
};
