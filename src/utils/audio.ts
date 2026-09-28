class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playBeep(freq = 440, duration = 0.08, type: OscillatorType = 'sine') {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  playSuccess() {
    if (this.muted) return;
    this.playBeep(523.25, 0.1, 'triangle'); // C5
    setTimeout(() => this.playBeep(659.25, 0.1, 'triangle'), 90); // E5
    setTimeout(() => this.playBeep(783.99, 0.12, 'triangle'), 180); // G5
    setTimeout(() => this.playBeep(1046.50, 0.25, 'triangle'), 270); // C6
  }

  playError() {
    if (this.muted) return;
    this.playBeep(220, 0.15, 'sawtooth');
    setTimeout(() => this.playBeep(180, 0.2, 'sawtooth'), 120);
  }

  playLock() {
    if (this.muted) return;
    this.playBeep(440, 0.06, 'sine');
    setTimeout(() => this.playBeep(880, 0.1, 'sine'), 70);
  }
}

export const sound = new SoundEngine();
