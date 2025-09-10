import { useEffect, useState, useCallback, useRef } from 'react';

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [visibilityState, setVisibilityState] = useState(document.visibilityState);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLogRef = useRef<number>(0);

  const handleVisibilityChange = useCallback(() => {
    const newVisible = !document.hidden;
    const newVisibilityState = document.visibilityState;
    
    // Debounce rapid changes to prevent video glitching
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      setIsVisible(newVisible);
      setVisibilityState(newVisibilityState);
      
      // Throttle logging to prevent spam (max once per 2 seconds)
      const now = Date.now();
      if (now - lastLogRef.current > 2000) {
        console.log('Page visibility changed:', {
          hidden: document.hidden,
          visibilityState: document.visibilityState
        });
        lastLogRef.current = now;
      }
    }, 100); // 100ms debounce to prevent rapid changes
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [handleVisibilityChange]);

  return {
    isVisible,
    visibilityState,
    isHidden: !isVisible
  };
};