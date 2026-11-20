import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { StoryExperience } from './components/StoryExperience';
import { AppWorkspace } from './components/AppWorkspace';
import type { AppViewMode } from './types/vision';

export default function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('view') === 'demo') {
        return 'app';
      }
    }
    return 'story';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleEnterDemo = () => {
    setViewMode('app');
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const handleBackToStory = () => {
    setViewMode('story');
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      {viewMode === 'story' ? (
        <StoryExperience onEnterDemo={handleEnterDemo} reducedMotion={reducedMotion} />
      ) : (
        <AppWorkspace onBackToStory={handleBackToStory} />
      )}
    </MotionConfig>
  );
}
