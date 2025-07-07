
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface AudioIndicatorProps {
  stream: MediaStream | null;
  className?: string;
}

export const AudioIndicator = ({ stream, className = "" }: AudioIndicatorProps) => {
  const { audioLevel, isActive } = useAudioVisualizer(stream);

  if (!isActive) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex space-x-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-green-400 rounded-full transition-all duration-150 ${
              audioLevel > (i + 1) * 20 ? 'h-4' : 'h-1'
            }`}
          />
        ))}
      </div>
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
    </div>
  );
};
