// Zombie Apocalypse - Audio Manager

class AudioManager {
  constructor() {
    this.initialized = false;
    this.muted = false;
    this.musicVolume = 0.3;
    this.sfxVolume = 0.7;
    this.ambientVolume = 0.2;

    // Audio context for synthesized sounds
    this.ctx = null;

    // Track active sounds
    this.activeSounds = new Map();
    this.ambientPlaying = false;

    // Preloaded audio buffers (for Web Audio API)
    this.buffers = {};

    // HTML Audio elements
    this.sounds = {};

    // Synth sound generators
    this.synths = {};
  }

  /**
   * Initialize the audio system.
   * Must be called from a user gesture (click/touch).
   */
  async init() {
    if (this.initialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('🔊 Audio system initialized');
    } catch (e) {
      console.warn('⚠️  Web Audio API not available:', e);
    }
  }

  /**
   * Resume audio context (needed for autoplay policies).
   */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play a synthesized heartbeat sound.
   */
  playHeartbeat(rate = 1.0) {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 60;
    gain.gain.value = 0;

    // Heartbeat envelope: two quick thumps
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    gain.gain.setValueAtTime(0, now + 0.25);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.30);
    gain.gain.linearRampToValueAtTime(0, now + 0.40);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Play infection alarm sound.
   */
  playInfection() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;

    // Harsh alarm
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);

    // Low boom
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 80;
    gain2.gain.setValueAtTime(0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.5);

    this.vibrateInfection();
  }

  /**
   * Vibrate on infection (mobile only).
   */
  vibrateInfection() {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }

  /**
   * Play item pickup sound.
   */
  playItemPickup() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
    osc.frequency.linearRampToValueAtTime(800, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Play UI click sound.
   */
  playClick() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Play UI hover sound.
   */
  playHover() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 400;
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Play notification sound.
   */
  playNotification() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1100, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Play zombie growl (low frequency rumble).
   */
  playZombieGrowl() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + Math.random() * 40, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.5);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  /**
   * Toggle mute.
   */
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Set volumes.
   */
  setMusicVolume(v) { this.musicVolume = clamp(v, 0, 1); }
  setSfxVolume(v) { this.sfxVolume = clamp(v, 0, 1); }
  setAmbientVolume(v) { this.ambientVolume = clamp(v, 0, 1); }

  /**
   * Get mute state.
   */
  isMuted() {
    return this.muted;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Singleton
const audio = new AudioManager();
window.audio = audio;
