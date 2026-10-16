import { DetectedChord } from '../types';

export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface ChordTemplate {
  nameSuffix: string;
  quality: string;
  intervals: number[]; // semitone offsets from root
  weights: number[];   // relative weighting for root, 3rd, 5th, 7th
}

const CHORD_TEMPLATES: ChordTemplate[] = [
  // Triads
  { nameSuffix: '', quality: 'Major', intervals: [0, 4, 7], weights: [1.3, 1.0, 1.0] },
  { nameSuffix: 'm', quality: 'Minor', intervals: [0, 3, 7], weights: [1.3, 1.0, 1.0] },
  { nameSuffix: 'dim', quality: 'Diminished', intervals: [0, 3, 6], weights: [1.2, 0.9, 0.9] },
  { nameSuffix: 'aug', quality: 'Augmented', intervals: [0, 4, 8], weights: [1.2, 0.9, 0.9] },
  { nameSuffix: 'sus4', quality: 'Suspended 4th', intervals: [0, 5, 7], weights: [1.2, 1.0, 0.9] },
  { nameSuffix: 'sus2', quality: 'Suspended 2nd', intervals: [0, 2, 7], weights: [1.2, 1.0, 0.9] },
  // Seventh Chords
  { nameSuffix: '7', quality: 'Dominant 7th', intervals: [0, 4, 7, 10], weights: [1.2, 0.9, 0.9, 0.9] },
  { nameSuffix: 'maj7', quality: 'Major 7th', intervals: [0, 4, 7, 11], weights: [1.2, 0.9, 0.8, 0.9] },
  { nameSuffix: 'm7', quality: 'Minor 7th', intervals: [0, 3, 7, 10], weights: [1.2, 0.9, 0.8, 0.9] },
  { nameSuffix: 'm7b5', quality: 'Half-Diminished', intervals: [0, 3, 6, 10], weights: [1.1, 0.9, 0.8, 0.8] },
  { nameSuffix: 'dim7', quality: 'Diminished 7th', intervals: [0, 3, 6, 9], weights: [1.1, 0.9, 0.8, 0.8] },
];

export class ChromagramChordDetector {
  private sampleRate: number;
  private fftSize: number;
  private smoothedChroma: Float32Array;
  private lastDetectedChord: DetectedChord | null = null;
  private stableCount: number = 0;

  constructor(sampleRate: number = 44100, fftSize: number = 2048) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.smoothedChroma = new Float32Array(12);
  }

  public updateConfig(sampleRate: number, fftSize: number) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
  }

  /**
   * Computes a 12-bin Pitch Class Profile (Chroma) from frequency magnitudes.
   * Accepts magnitude spectrum array from AnalyserNode.getFloatFrequencyData or getByteFrequencyData.
   */
  public extractChromaFromFrequencies(
    frequencyData: Float32Array,
    minFreq: number = 70,
    maxFreq: number = 2800
  ): { chroma: Float32Array; bassChroma: Float32Array } {
    const chroma = new Float32Array(12);
    const bassChroma = new Float32Array(12);
    const numBins = frequencyData.length;
    const binResolution = this.sampleRate / (numBins * 2);

    for (let i = 1; i < numBins; i++) {
      const freq = i * binResolution;
      if (freq < minFreq || freq > maxFreq) continue;

      // Convert dB or raw magnitude to linear energy
      // If data is in dB (typically -100 to 0)
      const db = frequencyData[i];
      if (db < -75) continue; // Noise floor cut

      const linearMag = Math.pow(10, db / 20);

      // Pitch in continuous semitones (A4 = 440 Hz = 69)
      const midiFloat = 69 + 12 * Math.log2(freq / 440);
      const pitchClass = ((Math.round(midiFloat) % 12) + 12) % 12;

      // Distance from nominal semitone center
      const deviation = Math.abs(midiFloat - Math.round(midiFloat));
      // Gaussian filter weight for in-tune harmonics
      const pitchWeight = Math.exp(-0.5 * Math.pow(deviation / 0.35, 2));

      // Frequency weighting: focus on fundamental frequencies (A2-A5, 110Hz-880Hz)
      const freqWeight = freq > 110 && freq < 880 ? 1.4 : 1.0;

      const energy = linearMag * pitchWeight * freqWeight;
      chroma[pitchClass] += energy;

      // Bass Chroma (60Hz - 220Hz)
      if (freq >= 60 && freq <= 220) {
        bassChroma[pitchClass] += linearMag * pitchWeight * 1.5;
      }
    }

    // Normalize Chroma vectors
    let maxChroma = 0;
    for (let c = 0; c < 12; c++) {
      if (chroma[c] > maxChroma) maxChroma = chroma[c];
    }
    if (maxChroma > 0) {
      for (let c = 0; c < 12; c++) {
        chroma[c] /= maxChroma;
      }
    }

    let maxBass = 0;
    for (let c = 0; c < 12; c++) {
      if (bassChroma[c] > maxBass) maxBass = bassChroma[c];
    }
    if (maxBass > 0) {
      for (let c = 0; c < 12; c++) {
        bassChroma[c] /= maxBass;
      }
    }

    return { chroma, bassChroma };
  }

  /**
   * Recognizes the best-fitting chord from the extracted chroma vector using template matching.
   */
  public detectChord(
    rawChroma: Float32Array,
    bassChroma: Float32Array,
    currentTime: number,
    sensitivityThreshold: number = 0.45
  ): DetectedChord | null {
    // Temporal smoothing (leaky integrator) to avoid jitter:
    // S[n] = alpha * S[n-1] + (1 - alpha) * X[n]
    const alpha = 0.65;
    for (let i = 0; i < 12; i++) {
      this.smoothedChroma[i] = alpha * this.smoothedChroma[i] + (1 - alpha) * rawChroma[i];
    }

    // Check if total energy is significant
    let totalEnergy = 0;
    for (let i = 0; i < 12; i++) {
      totalEnergy += this.smoothedChroma[i];
    }
    if (totalEnergy < 1.2) {
      return null;
    }

    let bestScore = -1;
    let bestRoot = 0;
    let bestTemplate: ChordTemplate = CHORD_TEMPLATES[0];

    // Evaluate all 12 roots against all chord templates
    for (let root = 0; root < 12; root++) {
      for (const tmpl of CHORD_TEMPLATES) {
        // Calculate similarity score between smoothed Chroma and template
        let matchScore = 0;
        let penaltyScore = 0;
        const activeIntervals = new Set(tmpl.intervals.map((inter) => (root + inter) % 12));

        for (let idx = 0; idx < tmpl.intervals.length; idx++) {
          const semitone = (root + tmpl.intervals[idx]) % 12;
          const weight = tmpl.weights[idx] || 1.0;
          matchScore += this.smoothedChroma[semitone] * weight;
        }

        // Penalize notes that shouldn't be in this chord
        for (let note = 0; note < 12; note++) {
          if (!activeIntervals.has(note)) {
            penaltyScore += this.smoothedChroma[note] * 0.45;
          }
        }

        // Root presence bonus
        const rootBonus = this.smoothedChroma[root] * 0.3;
        const finalScore = matchScore - penaltyScore + rootBonus;

        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestRoot = root;
          bestTemplate = tmpl;
        }
      }
    }

    // Normalized confidence (0.0 to 1.0)
    const confidence = Math.max(0, Math.min(1, (bestScore / (bestTemplate.intervals.length * 1.3))));

    if (confidence < sensitivityThreshold) {
      return null;
    }

    const rootName = PITCH_CLASSES[bestRoot];
    const chordName = `${rootName}${bestTemplate.nameSuffix}`;
    const chordNotes = bestTemplate.intervals.map((inter) => PITCH_CLASSES[(bestRoot + inter) % 12]);

    // Check for bass note (inversion / slash chord)
    let bassNote: string | undefined = undefined;
    let maxBassScore = 0;
    let bassIdx = -1;
    for (let b = 0; b < 12; b++) {
      if (bassChroma[b] > maxBassScore) {
        maxBassScore = bassChroma[b];
        bassIdx = b;
      }
    }

    // Only set slash chord if bass note is strong and distinct from root
    if (bassIdx >= 0 && maxBassScore > 0.65 && bassIdx !== bestRoot) {
      bassNote = PITCH_CLASSES[bassIdx];
    }

    const detected: DetectedChord = {
      id: `chord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chordName: bassNote ? `${chordName}/${bassNote}` : chordName,
      root: rootName,
      quality: bestTemplate.quality,
      notes: chordNotes,
      bassNote,
      confidence,
      chroma: Array.from(this.smoothedChroma),
      timestamp: currentTime,
    };

    return detected;
  }
}
