/**
 * AudioContext - React Context và Provider cho AudioManager
 * 
 * Cung cấp:
 * - useAudio hook để sử dụng AudioManager trong components
 * - AudioProvider để wrap app và initialize AudioManager
 * - SoundToggle component tích hợp sẵn
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AudioManager, AudioManifest, PlayOptions } from '../utils/AudioManager';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioContextType {
  audioManager: typeof AudioManager;
  isEnabled: boolean;
  volume: number;
  isUnlocked: boolean;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  unlock: () => Promise<void>;
  play: (name: string, options?: PlayOptions) => void;
  playLoop: (name: string, options?: PlayOptions) => void;
  stop: (name: string) => void;
  stopLoop: (name: string) => void;
  stopAll: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
  manifest: AudioManifest;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children, manifest }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [volume, setVolumeState] = useState(0.6);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Initialize AudioManager
  useEffect(() => {
    const init = async () => {
      await AudioManager.init();
      setIsEnabled(AudioManager.getEnabled());
      setVolumeState(AudioManager.getVolume());
      setIsUnlocked(AudioManager.isAudioUnlocked());

      // Preload audio files
      await AudioManager.preload(manifest);
    };

    init();
  }, [manifest]);

  // Unlock audio on first user interaction
  const unlock = useCallback(async () => {
    if (!isUnlocked) {
      await AudioManager.unlock();
      setIsUnlocked(AudioManager.isAudioUnlocked());
    }
  }, [isUnlocked]);

  // Set enabled
  const setEnabled = useCallback((enabled: boolean) => {
    AudioManager.setEnabled(enabled);
    setIsEnabled(enabled);
    
    // Unlock when enabling
    if (enabled && !isUnlocked) {
      unlock();
    }
  }, [isUnlocked, unlock]);

  // Set volume
  const setVolume = useCallback((vol: number) => {
    AudioManager.setVolume(vol);
    setVolumeState(vol);
  }, []);

  // Play sound
  const play = useCallback((name: string, options?: PlayOptions) => {
    AudioManager.play(name, options);
  }, []);

  // Play loop
  const playLoop = useCallback((name: string, options?: PlayOptions) => {
    AudioManager.playLoop(name, options);
  }, []);

  // Stop sound
  const stop = useCallback((name: string) => {
    AudioManager.stop(name);
  }, []);

  // Stop loop
  const stopLoop = useCallback((name: string) => {
    AudioManager.stopLoop(name);
  }, []);

  // Stop all
  const stopAll = useCallback(() => {
    AudioManager.stopAll();
  }, []);

  const value: AudioContextType = {
    audioManager: AudioManager,
    isEnabled,
    volume,
    isUnlocked,
    setEnabled,
    setVolume,
    unlock,
    play,
    playLoop,
    stop,
    stopLoop,
    stopAll,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

/**
 * SoundToggle Component - Nút bật/tắt âm thanh
 */
export const SoundToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isEnabled, setEnabled, unlock } = useAudio();

  const handleToggle = async () => {
    if (!isEnabled) {
      // Unlock audio when enabling
      await unlock();
    }
    setEnabled(!isEnabled);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-lg border-2 border-yellow-400 rounded-lg px-4 py-2 transition-all ${className}`}
      title={isEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
      aria-label={isEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
    >
      {isEnabled ? (
        <Volume2 className="w-5 h-5 text-yellow-400" />
      ) : (
        <VolumeX className="w-5 h-5 text-gray-400" />
      )}
      <span className="text-yellow-400 font-bold text-sm hidden sm:inline">
        {isEnabled ? 'Sound: On' : 'Sound: Off'}
      </span>
    </button>
  );
};
