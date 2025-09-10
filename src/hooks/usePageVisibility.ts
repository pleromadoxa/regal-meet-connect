import { useEffect, useState, useCallback } from 'react';

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [visibilityState, setVisibilityState] = useState(document.visibilityState);

  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden);
    setVisibilityState(document.visibilityState);
    
    console.log('Page visibility changed:', {
      hidden: document.hidden,
      visibilityState: document.visibilityState
    });
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for window focus/blur events
    const handleFocus = () => {
      console.log('Window focused');
    };
    
    const handleBlur = () => {
      console.log('Window blurred');
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleVisibilityChange]);

  return {
    isVisible,
    visibilityState,
    isHidden: !isVisible
  };
};