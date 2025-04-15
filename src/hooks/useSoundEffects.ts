import { useState, useEffect } from 'react';

// Map of sound names to their file paths
const SOUND_FILES = {
  tick: '/sounds/tick.mp3',
  success: '/sounds/success.mp3'
};

export function useSoundEffects() {
  const [muted, setMuted] = useState(() => {
    const savedPreference = localStorage.getItem('soundMuted');
    return savedPreference ? savedPreference === 'true' : false;
  });
  
  const [soundsLoaded, setSoundsLoaded] = useState<Record<string, boolean>>({});
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});

  // Initialize audio elements
  useEffect(() => {
    const elements: Record<string, HTMLAudioElement> = {};
    
    // Create and preload audio elements
    Object.entries(SOUND_FILES).forEach(([name, path]) => {
      const audio = new Audio();
      
      // Handle successful loading
      audio.addEventListener('canplaythrough', () => {
        setSoundsLoaded(prev => ({ ...prev, [name]: true }));
      });
      
      // Handle errors with console warning
      audio.addEventListener('error', (e) => {
        console.warn(`Failed to load sound: ${path}`, e);
        setSoundsLoaded(prev => ({ ...prev, [name]: false }));
      });
      
      audio.src = path;
      audio.preload = 'auto';
      elements[name] = audio;
    });
    
    setAudioElements(elements);
    
    // Clean up audio elements on unmount
    return () => {
      Object.values(elements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Save mute preference to localStorage
  useEffect(() => {
    localStorage.setItem('soundMuted', muted.toString());
  }, [muted]);
  
  // Function to play sounds with error handling
  const play = (soundName: keyof typeof SOUND_FILES) => {
    if (muted) return;
    
    const audio = audioElements[soundName];
    if (!audio || soundsLoaded[soundName] === false) return;
    
    try {
      // Reset to beginning if already playing
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      // Handle play() promise rejection (common in browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Error playing sound ${soundName}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  };
  
  return {
    play,
    muted,
    toggleMute: () => setMuted(prev => !prev),
    soundsLoaded
  };
}

// Simple utility for components that don't need the full hook
let muted = false;
const audioCache: Record<string, HTMLAudioElement> = {};

export function play(soundName: keyof typeof SOUND_FILES) {
  if (muted) return;
  
  try {
    // Check if sound is cached
    if (!audioCache[soundName]) {
      audioCache[soundName] = new Audio(SOUND_FILES[soundName]);
    }
    
    const audio = audioCache[soundName];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (error) {
    // Silently fail
  }
}

export function toggleMute(value?: boolean) {
  muted = value !== undefined ? value : !muted;
  return muted;
}
