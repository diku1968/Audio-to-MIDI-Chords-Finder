/**
 * Lightweight Polyphonic Synthesizer using Web Audio API
 * Allows real-time auditioning of detected MIDI notes and playback of converted tracks.
 */
export class WebAudioSynth {
  private ctx: AudioContext | null = null;
  private activeVoices: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor(audioContext?: AudioContext) {
    if (audioContext) {
      this.init(audioContext);
    }
  }

  public init(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    this.masterGain.connect(ctx.destination);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.18, this.ctx.currentTime, 0.02);
    }
  }

  public noteOn(midiNote: number, velocity: number = 80) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Stop existing voice if any
    this.noteOff(midiNote);

    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Warm synthesizer sound (triangle + slight lowpass filtering)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4000, freq * 4), this.ctx.currentTime);

    const velGain = (velocity / 127) * 0.4;
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(velGain, this.ctx.currentTime + 0.015);
    gain.gain.setTargetAtTime(velGain * 0.7, this.ctx.currentTime + 0.05, 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    this.activeVoices.set(midiNote, { osc, gain });
  }

  public noteOff(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.ctx) return;

    const { osc, gain } = voice;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    }, 90);

    this.activeVoices.delete(midiNote);
  }

  public stopAll() {
    for (const [note] of this.activeVoices) {
      this.noteOff(note);
    }
    this.activeVoices.clear();
  }
}
