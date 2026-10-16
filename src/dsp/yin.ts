import { PitchDetectionResult } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts a frequency in Hz to standard MIDI note number and cents deviation.
 */
export function frequencyToMidi(frequency: number): {
  midiNote: number;
  noteName: string;
  centsOff: number;
} {
  if (frequency <= 0 || !isFinite(frequency)) {
    return { midiNote: 0, noteName: '---', centsOff: 0 };
  }

  // A4 = 440 Hz = MIDI 69
  const exactMidi = 69 + 12 * Math.log2(frequency / 440);
  const roundedMidi = Math.round(exactMidi);
  const centsOff = Math.round((exactMidi - roundedMidi) * 100);

  if (roundedMidi < 0 || roundedMidi > 127) {
    return { midiNote: 0, noteName: '---', centsOff: 0 };
  }

  const pitchClass = roundedMidi % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteName = `${NOTE_NAMES[pitchClass]}${octave}`;

  return {
    midiNote: roundedMidi,
    noteName,
    centsOff: Math.max(-50, Math.min(50, centsOff)),
  };
}

/**
 * Calculates the Root Mean Square (RMS) energy of an audio buffer.
 */
export function calculateRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Implementation of the YIN Pitch Detection Algorithm.
 * Monophonic fundamental frequency estimator with parabolic interpolation.
 */
export class YinDetector {
  private threshold: number;
  private sampleRate: number;
  private bufferSize: number;
  private halfBuffer: number;
  private diffBuffer: Float32Array;

  constructor(sampleRate: number = 44100, bufferSize: number = 1024, threshold: number = 0.15) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.threshold = threshold;
    this.halfBuffer = Math.floor(bufferSize / 2);
    this.diffBuffer = new Float32Array(this.halfBuffer);
  }

  public updateConfig(sampleRate: number, bufferSize: number, threshold: number) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.threshold = threshold;
    this.halfBuffer = Math.floor(bufferSize / 2);
    if (this.diffBuffer.length !== this.halfBuffer) {
      this.diffBuffer = new Float32Array(this.halfBuffer);
    }
  }

  /**
   * Detects the pitch of the provided audio buffer.
   * Expects mono audio PCM samples normalized to [-1.0, 1.0].
   */
  public detect(buffer: Float32Array, minHz: number = 65, maxHz: number = 1050): PitchDetectionResult {
    const rms = calculateRms(buffer);
    const silenceResult: PitchDetectionResult = {
      frequency: 0,
      confidence: 0,
      midiNote: 0,
      noteName: '---',
      centsOff: 0,
      rms,
    };

    // Quick energy gate check
    if (rms < 0.008) {
      return silenceResult;
    }

    const minTau = Math.max(2, Math.floor(this.sampleRate / maxHz));
    const maxTau = Math.min(this.halfBuffer - 1, Math.ceil(this.sampleRate / minHz));

    const half = this.halfBuffer;
    const diff = this.diffBuffer;

    // Step 1: Difference Function
    // d_t(tau) = sum_{j=0}^{W-1} (x[j] - x[j + tau])^2
    diff[0] = 0;
    for (let tau = 1; tau < half; tau++) {
      let sum = 0;
      for (let j = 0; j < half; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference Function
    // d'_t(tau) = 1 if tau == 0, else d_t(tau) / ( (1/tau) * sum_{j=1}^{tau} d_t(j) )
    diff[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < half; tau++) {
      runningSum += diff[tau];
      if (runningSum > 0) {
        diff[tau] = (diff[tau] * tau) / runningSum;
      } else {
        diff[tau] = 1;
      }
    }

    // Step 3: Absolute Thresholding
    // Find the first tau where diff[tau] < threshold
    let periodTau = -1;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (diff[tau] < this.threshold) {
        // Find local minimum
        while (tau + 1 < maxTau && diff[tau + 1] < diff[tau]) {
          tau++;
        }
        periodTau = tau;
        break;
      }
    }

    // Fallback: If no value fell below threshold, find global minimum in valid range
    if (periodTau === -1) {
      let minVal = 1.0;
      for (let tau = minTau; tau < maxTau; tau++) {
        if (diff[tau] < minVal) {
          minVal = diff[tau];
          periodTau = tau;
        }
      }
      // If even global minimum is too noisy (e.g. diff > 0.45), consider it unvoiced
      if (minVal > 0.45) {
        return silenceResult;
      }
    }

    if (periodTau <= 0) {
      return silenceResult;
    }

    // Step 4: Parabolic Interpolation for sub-sample accuracy
    let betterTau = periodTau;
    if (periodTau > 0 && periodTau < half - 1) {
      const s0 = diff[periodTau - 1];
      const s1 = diff[periodTau];
      const s2 = diff[periodTau + 1];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (Math.abs(denom) > 1e-6) {
        const delta = (s2 - s0) / denom;
        betterTau = periodTau + delta;
      }
    }

    const frequency = this.sampleRate / betterTau;
    if (frequency < minHz || frequency > maxHz) {
      return silenceResult;
    }

    const confidence = Math.max(0, Math.min(1, 1 - diff[periodTau]));
    const { midiNote, noteName, centsOff } = frequencyToMidi(frequency);

    return {
      frequency,
      confidence,
      midiNote,
      noteName,
      centsOff,
      rms,
    };
  }
}
