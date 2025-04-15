import { useState, useEffect } from 'react';

// Sound paths
const SOUNDS = {
  tick: '/assets/sounds/tick.mp3',
  success: '/assets/sounds/success.mp3',
};

// Preloaded audio instances
const audioInstances: Record<string, HTMLAudioElement> = {};

// Initialize and preload audio files
const initAudio = () => {
  try {
    Object.entries(SOUNDS).forEach(([key, path]) => {
      const audio = new Audio();
      audio.src = path;
      audio.preload = 'auto';
      audioInstances[key] = audio;
    });
  } catch (error) {
    console.warn('Error initializing audio:', error);
  }
};

export const useSoundEffects = () => {
  const [muted, setMuted] = useState(
    localStorage.getItem('soundEffectsMuted') === 'true'
  );

  useEffect(() => {
    // Initialize audio on first mount
    if (Object.keys(audioInstances).length === 0) {
      initAudio();
    }
    
    // Save mute preference
    localStorage.setItem('soundEffectsMuted', muted.toString());
  }, [muted]);

  const play = (sound: keyof typeof SOUNDS) => {
    try {
      if (muted) return;
      
      const audio = audioInstances[sound];
      if (!audio) return;
      
      // Reset and play
      audio.currentTime = 0;
      audio.play().catch(err => {
        // Ignore user interaction errors (common in browsers)
        if (err.name !== 'NotAllowedError') {
          console.warn(`Error playing ${sound} sound:`, err);
        }
      });
    } catch (error) {
      // Silently fail without breaking the app
      console.warn(`Failed to play ${sound} sound:`, error);
    }
  };

  return {
    play,
    muted,
    toggleMute: () => setMuted(prev => !prev)
  };
};
