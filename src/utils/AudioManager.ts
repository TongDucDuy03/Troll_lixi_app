/**
 * AudioManager - Quản lý âm thanh cho Lì Xì May Mắn
 * 
 * Tính năng:
 * - State machine cho các trạng thái âm thanh
 * - Unlock audio theo autoplay policy
 * - Preload audio files
 * - Volume control và priority system
 * - Throttle cho scratch sound
 * - Queue system cho events trước khi unlock
 */

export type AudioState = 'IDLE' | 'SPIN_START' | 'SPINNING' | 'RESULT_REVEAL' | 'SCRATCH_START' | 'SCRATCH_COMPLETE' | 'NEXT_ROUND';

export interface AudioManifest {
  [key: string]: {
    url: string;
    volume?: number; // 0.0 - 1.0, override master volume
    loop?: boolean;
    rate?: number; // playback rate
    priority?: number; // higher = more important, can interrupt lower priority
  };
}

export interface PlayOptions {
  volume?: number;
  loop?: boolean;
  rate?: number;
  priority?: number;
  debounceMs?: number; // debounce time for same sound
  onEnded?: () => void;
}

class AudioManagerClass {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private activeSounds: Map<string, AudioBufferSourceNode> = new Map();
  private activeLoops: Map<string, AudioBufferSourceNode> = new Map();
  private isUnlocked = false;
  private isEnabled = false;
  private masterVolume = 0.6;
  private maxConcurrentSounds = 2;
  private currentSoundCount = 0;
  private queuedEvents: Array<{ name: string; options?: PlayOptions }> = [];
  private lastPlayTime: Map<string, number> = new Map();
  private manifest: AudioManifest = {};
  private gainNode: GainNode | null = null;

  // Scratch sound throttle: max 6 times per second
  private scratchLastPlayTime = 0;
  private readonly SCRATCH_THROTTLE_MS = 1000 / 6; // ~166ms

  /**
   * Initialize AudioManager
   */
  async init(): Promise<void> {
    try {
      // Create AudioContext (suspended state initially)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.masterVolume;
      this.gainNode.connect(this.audioContext.destination);

      // Load saved settings
      const savedEnabled = localStorage.getItem('audio_enabled');
      if (savedEnabled === 'true') {
        this.isEnabled = true;
      }

      const savedVolume = localStorage.getItem('audio_volume');
      if (savedVolume) {
        this.masterVolume = parseFloat(savedVolume);
        if (this.gainNode) {
          this.gainNode.gain.value = this.masterVolume;
        }
      }

      console.log('🎵 AudioManager initialized', { enabled: this.isEnabled, volume: this.masterVolume });
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
    }
  }

  /**
   * Unlock audio context (must be called after user gesture)
   */
  async unlock(): Promise<void> {
    if (this.isUnlocked || !this.audioContext) return;

    try {
      // Resume AudioContext (required for autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play silent sound to unlock (required on iOS/Safari)
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      source.stop(0.001);

      this.isUnlocked = true;
      console.log('🔓 Audio unlocked');

      // Process queued events
      if (this.queuedEvents.length > 0) {
        console.log(`📦 Processing ${this.queuedEvents.length} queued events`);
        const events = [...this.queuedEvents];
        this.queuedEvents = [];
        for (const event of events) {
          this.play(event.name, event.options);
        }
      }
    } catch (error) {
      console.error('❌ Failed to unlock audio:', error);
    }
  }

  /**
   * Set audio enabled/disabled
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('audio_enabled', enabled ? 'true' : 'false');
    
    if (!enabled) {
      this.stopAll();
    }
    
    console.log('🔊 Audio', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Get enabled state
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Set master volume (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.masterVolume;
    }
    localStorage.setItem('audio_volume', this.masterVolume.toString());
  }

  /**
   * Get master volume
   */
  getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Load audio manifest and preload all files
   */
  async preload(manifest: AudioManifest): Promise<void> {
    if (!this.audioContext) {
      console.warn('⚠️ AudioContext not initialized, cannot preload');
      return;
    }

    this.manifest = manifest;
    const loadPromises: Promise<void>[] = [];

    for (const [name, config] of Object.entries(manifest)) {
      loadPromises.push(
        this.loadAudioBuffer(name, config.url)
        // No catch needed - loadAudioBuffer now handles errors gracefully with silent buffers
      );
    }

    await Promise.all(loadPromises);
    const loadedCount = Array.from(this.audioBuffers.values()).filter(
      (buf) => buf.length > 100 // Silent buffers are very short (~0.1s = ~4410 samples at 44.1kHz)
    ).length;
    const totalCount = Object.keys(manifest).length;
    if (loadedCount < totalCount) {
      console.warn(`⚠️ ${totalCount - loadedCount} audio files not found, using silent fallback. Add files to public/assets/sfx/ to enable sounds.`);
    }
    console.log(`✅ Preloaded ${loadedCount}/${totalCount} audio files`);
  }

  /**
   * Create silent audio buffer (fallback when file doesn't exist)
   */
  private createSilentBuffer(duration: number = 0.1): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    // Buffer is already silent (all zeros)
    return buffer;
  }

  /**
   * Load single audio file into buffer
   */
  private async loadAudioBuffer(name: string, url: string): Promise<void> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    if (this.audioBuffers.has(name)) return; // Already loaded

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // File doesn't exist - create silent buffer as fallback
        console.warn(`⚠️ Audio file not found: ${name} (${url}), using silent buffer`);
        const silentBuffer = this.createSilentBuffer(0.1);
        this.audioBuffers.set(name, silentBuffer);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);
      console.log(`✅ Loaded audio: ${name}`);
    } catch (error) {
      // Network error or decode error - create silent buffer as fallback
      console.warn(`⚠️ Failed to load ${name} from ${url}, using silent buffer:`, error);
      const silentBuffer = this.createSilentBuffer(0.1);
      this.audioBuffers.set(name, silentBuffer);
    }
  }

  /**
   * Play sound by name
   */
  play(name: string, options: PlayOptions = {}): void {
    if (!this.isEnabled) return;

    // If not unlocked, queue the event
    if (!this.isUnlocked) {
      // Only keep the last event of each type to avoid queue overflow
      const existingIndex = this.queuedEvents.findIndex((e) => e.name === name);
      if (existingIndex >= 0) {
        this.queuedEvents[existingIndex] = { name, options };
      } else {
        this.queuedEvents.push({ name, options });
      }
      return;
    }

    // Check debounce
    if (options.debounceMs) {
      const lastPlay = this.lastPlayTime.get(name) || 0;
      if (Date.now() - lastPlay < options.debounceMs) {
        return;
      }
    }

    // Special handling for scratch sound (throttle)
    if (name === 'scratch') {
      const now = Date.now();
      if (now - this.scratchLastPlayTime < this.SCRATCH_THROTTLE_MS) {
        return;
      }
      this.scratchLastPlayTime = now;
    }

    // Check concurrent sound limit
    if (this.currentSoundCount >= this.maxConcurrentSounds && !options.priority) {
      // Stop lowest priority sound if we have priority sounds
      const priority = options.priority || 0;
      let lowestPriority = Infinity;
      let lowestPriorityName = '';

      for (const [activeName, source] of this.activeSounds.entries()) {
        const activeConfig = this.manifest[activeName];
        const activePriority = activeConfig?.priority || 0;
        if (activePriority < lowestPriority) {
          lowestPriority = activePriority;
          lowestPriorityName = activeName;
        }
      }

      if (priority > lowestPriority && lowestPriorityName) {
        this.stop(lowestPriorityName);
      } else {
        return; // Don't play if we're at limit and this isn't high priority
      }
    }

    this._playSound(name, options);
  }

  /**
   * Internal method to actually play the sound
   */
  private _playSound(name: string, options: PlayOptions = {}): void {
    if (!this.audioContext || !this.gainNode) return;

    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      // Throttle warnings to avoid console spam
      const lastWarning = this.lastPlayTime.get(`_warning_${name}`) || 0;
      if (Date.now() - lastWarning > 5000) { // Only warn once per 5 seconds
        console.warn(`⚠️ Audio buffer not found: ${name} (file may be missing)`);
        this.lastPlayTime.set(`_warning_${name}`, Date.now());
      }
      return;
    }

    const config = this.manifest[name] || {};
    const volume = options.volume ?? config.volume ?? 1.0;
    const rate = options.rate ?? config.rate ?? 1.0;
    const loop = options.loop ?? config.loop ?? false;

    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;

    // Create gain node for this specific sound
    const soundGain = this.audioContext.createGain();
    soundGain.gain.value = volume;
    source.connect(soundGain);
    soundGain.connect(this.gainNode);

    // Handle ended event
    source.onended = () => {
      this.activeSounds.delete(name);
      this.currentSoundCount--;
      if (options.onEnded) {
        options.onEnded();
      }
    };

    // Start playback
    try {
      source.start(0);
      this.activeSounds.set(name, source);
      this.currentSoundCount++;
      this.lastPlayTime.set(name, Date.now());
    } catch (error) {
      console.error(`❌ Failed to play ${name}:`, error);
      this.activeSounds.delete(name);
    }
  }

  /**
   * Play sound in loop
   */
  playLoop(name: string, options: PlayOptions = {}): void {
    if (!this.isEnabled) return;

    // Stop existing loop if any
    this.stopLoop(name);

    const config = this.manifest[name] || {};
    const loopOptions: PlayOptions = {
      ...options,
      loop: true,
      priority: options.priority ?? config.priority ?? 1,
    };

    this.play(name, loopOptions);
  }

  /**
   * Stop specific sound
   */
  stop(name: string): void {
    const source = this.activeSounds.get(name);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.activeSounds.delete(name);
      this.currentSoundCount--;
    }

    // Also stop loop if it exists
    this.stopLoop(name);
  }

  /**
   * Stop loop sound
   */
  stopLoop(name: string): void {
    const loopSource = this.activeLoops.get(name);
    if (loopSource) {
      try {
        loopSource.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.activeLoops.delete(name);
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    for (const [name] of this.activeSounds) {
      this.stop(name);
    }
    for (const [name] of this.activeLoops) {
      this.stopLoop(name);
    }
    this.currentSoundCount = 0;
  }

  /**
   * Check if audio is unlocked
   */
  isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Get audio context state
   */
  getAudioContextState(): string {
    return this.audioContext?.state || 'closed';
  }
}

// Singleton instance
export const AudioManager = new AudioManagerClass();
