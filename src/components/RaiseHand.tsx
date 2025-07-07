
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Hand } from 'lucide-react';

interface RaiseHandProps {
  onHandRaise: (isRaised: boolean) => void;
  isRaised?: boolean;
}

export const RaiseHand = ({ onHandRaise, isRaised = false }: RaiseHandProps) => {
  const [handRaised, setHandRaised] = useState(isRaised);

  const toggleHand = useCallback(() => {
    const newState = !handRaised;
    setHandRaised(newState);
    onHandRaise(newState);
  }, [handRaised, onHandRaise]);

  return (
    <Button
      onClick={toggleHand}
      variant="outline"
      size="sm"
      className={`${
        handRaised 
          ? 'bg-yellow-500/80 border-yellow-400 text-white hover:bg-yellow-600/80' 
          : 'bg-white/20 border-white/40 text-white hover:bg-white/30'
      } shadow-lg backdrop-blur-sm transition-all duration-200`}
    >
      <Hand className="h-3 w-3 sm:h-4 sm:w-4" />
    </Button>
  );
};
