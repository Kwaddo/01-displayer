import React, { useEffect } from 'react';

const ZoomOnResolution: React.FC = () => {
  useEffect(() => {
    const applyZoom = () => {
      if (window.innerWidth === 1920 && window.innerHeight === 1080) {
        // Apply zoom out to 75%
        document.body.style.transform = 'scale(0.75)';
        document.body.style.transformOrigin = 'top left';
      } else {
        // Remove zoom if not 1920x1080
        document.body.style.transform = 'none';
      }
    };
    applyZoom();
    window.addEventListener('resize', applyZoom);
    return () => {
      window.removeEventListener('resize', applyZoom);
    };
  }, []);

  return null;
};

export default ZoomOnResolution;
