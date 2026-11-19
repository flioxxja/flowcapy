/**
 * Motor de paisajes sonoros generativos (100% Web Audio API, sin archivos externos).
 * Produce ruido marrón profundo, lluvia cálida filtrada, frecuencia binaural 40Hz
 * y campana armónica al completar cada fase del Pomodoro.
 */

export type SoundscapeMode = "off" | "brown" | "rain" | "binaural";

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private mode: SoundscapeMode = "off";
  private volume = 0.28;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private stopActiveNodes() {
    for (const node of this.activeNodes) {
      try {
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes.
      }
    }
    this.activeNodes = [];
  }

  private createNoiseBuffer(ctx: AudioContext, type: "brown" | "pink"): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const output = buffer.getChannelData(ch);
      if (type === "brown") {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.2;
        }
      } else {
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
          b6 = white * 0.115926;
        }
      }
    }
    return buffer;
  }

  public setMode(nextMode: SoundscapeMode): void {
    this.mode = nextMode;
    if (nextMode === "off") {
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      }
      window.setTimeout(() => {
        if (this.mode === "off") this.stopActiveNodes();
      }, 400);
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.stopActiveNodes();

    if (nextMode === "brown") {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx, "brown");
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 340;

      source.connect(filter);
      filter.connect(this.masterGain);
      source.start();
      this.activeNodes = [source, filter];
    } else if (nextMode === "rain") {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx, "pink");
      source.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 920;
      bandpass.Q.value = 0.65;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.14;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);

      source.connect(bandpass);
      bandpass.connect(this.masterGain);
      source.start();
      lfo.start();
      this.activeNodes = [source, bandpass, lfo, lfoGain];
    } else if (nextMode === "binaural") {
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      leftOsc.type = "sine";
      rightOsc.type = "sine";
      leftOsc.frequency.value = 196;
      rightOsc.frequency.value = 236; // 40Hz gamma difference

      const merger = ctx.createChannelMerger(2);
      const toneGain = ctx.createGain();
      toneGain.gain.value = 0.22;

      leftOsc.connect(merger, 0, 0);
      rightOsc.connect(merger, 0, 1);
      merger.connect(toneGain);
      toneGain.connect(this.masterGain);

      leftOsc.start();
      rightOsc.start();
      this.activeNodes = [leftOsc, rightOsc, merger, toneGain];
    }

    this.masterGain.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.25);
  }

  public setVolume(nextVolume: number): void {
    this.volume = Math.max(0, Math.min(1, nextVolume));
    if (this.ctx && this.masterGain && this.mode !== "off") {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  /** Campana armónica cálida al cambiar de fase del Pomodoro. */
  public playChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.09 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 1.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 1.4);
    });
  }
}

export const soundEngine = new AmbientSoundEngine();
