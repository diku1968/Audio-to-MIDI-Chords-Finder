/**
 * Audio Preset Generators using Web Audio Synthesis
 * Generates realistic audio test buffers: Acoustic Guitar chords, Vocal Humming, Piano Cadence, Pitch Sweep
 */

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
  type: 'chords' | 'melody';
  durationSeconds: number;
}

export const PRESET_LIST: PresetInfo[] = [
  {
    id: 'guitar_chords',
    name: 'Acoustic Guitar Strum (C - Am - F - G)',
    description: '4-chord pop progression with plucked string harmonics and bass notes.',
    type: 'chords',
    durationSeconds: 8,
  },
  {
    id: 'vocal_humming',
    name: 'Vocal Humming Melody (Do-Re-Mi...)',
    description: 'Human vocal humming with natural vibrato, portamento and formant resonance.',
    type: 'melody',
    durationSeconds: 7,
  },
  {
    id: 'piano_cadence',
    name: 'Grand Piano Cadence (C - G - Am - Em - F - G7 - C)',
    description: 'Full rich piano chords with inversions and resonant overtones.',
    type: 'chords',
    durationSeconds: 10,
  },
  {
    id: 'sine_sweep',
    name: 'Clean Sine Scale (C4 to C5 Ascending)',
    description: 'Clean stepped musical scale to benchmark pitch segmentation and cents offset.',
    type: 'melody',
    durationSeconds: 6,
  },
];

/**
 * Generates an AudioBuffer containing the requested preset sound.
 */
export function generatePresetAudioBuffer(ctx: AudioContext, presetId: string): AudioBuffer {
  const sampleRate = ctx.sampleRate;

  if (presetId === 'guitar_chords') {
    return generateGuitarProgression(ctx, sampleRate);
  } else if (presetId === 'vocal_humming') {
    return generateVocalHumming(ctx, sampleRate);
  } else if (presetId === 'piano_cadence') {
    return generatePianoProgression(ctx, sampleRate);
  } else {
    return generateCleanScale(ctx, sampleRate);
  }
}

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/**
 * Generates a Karplus-Strong / plucked string style acoustic guitar strum
 */
function generateGuitarProgression(ctx: AudioContext, sampleRate: number): AudioBuffer {
  const duration = 8.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Chords: C (C3, E3, G3, C4, E4), Am (A2, E3, A3, C4, E4), F (F2, C3, F3, A3, C4), G (G2, B2, D3, G3, D4)
  const chords = [
    { notes: [48, 52, 55, 60, 64], start: 0.1, duration: 1.85 }, // C
    { notes: [45, 52, 57, 60, 64], start: 2.1, duration: 1.85 }, // Am
    { notes: [41, 48, 53, 57, 60], start: 4.1, duration: 1.85 }, // F
    { notes: [43, 47, 50, 55, 62], start: 6.1, duration: 1.80 }, // G
  ];

  for (const chord of chords) {
    chord.notes.forEach((midi, stringIdx) => {
      const freq = midiToHz(midi);
      const strStartSample = Math.floor((chord.start + stringIdx * 0.035) * sampleRate);
      const strLength = Math.min(numSamples - strStartSample, Math.floor(chord.duration * sampleRate));

      // Additive harmonics simulating guitar body resonance
      for (let i = 0; i < strLength; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * (1.8 + (midi - 40) * 0.04));
        // Fundamental + 2nd + 3rd + 4th harmonic
        const sampleVal =
          (Math.sin(2 * Math.PI * freq * t) * 0.5 +
            Math.sin(2 * Math.PI * freq * 2 * t) * 0.28 +
            Math.sin(2 * Math.PI * freq * 3 * t) * 0.15 +
            Math.sin(2 * Math.PI * freq * 4 * t) * 0.08) *
          decay *
          0.18;

        data[strStartSample + i] += sampleVal;
      }
    });
  }

  // Normalize
  normalizeBuffer(data);
  return buffer;
}

/**
 * Generates human vocal humming (C4-D4-E4-F4-G4-E4-C4) with vibrato and formant filtering
 */
function generateVocalHumming(ctx: AudioContext, sampleRate: number): AudioBuffer {
  const duration = 7.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const notes = [
    { midi: 60, start: 0.2, len: 0.8 }, // C4
    { midi: 62, start: 1.1, len: 0.8 }, // D4
    { midi: 64, start: 2.0, len: 0.8 }, // E4
    { midi: 65, start: 2.9, len: 0.8 }, // F4
    { midi: 67, start: 3.8, len: 1.1 }, // G4
    { midi: 64, start: 5.0, len: 0.7 }, // E4
    { midi: 60, start: 5.8, len: 1.0 }, // C4
  ];

  for (const n of notes) {
    const baseFreq = midiToHz(n.midi);
    const startSample = Math.floor(n.start * sampleRate);
    const length = Math.floor(n.len * sampleRate);

    let phase = 0;
    for (let i = 0; i < length && startSample + i < numSamples; i++) {
      const t = i / sampleRate;
      // Vibrato (5.5 Hz, ~30 cents depth)
      const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * (baseFreq * 0.018);
      const instantFreq = baseFreq + vibrato;

      phase += (2 * Math.PI * instantFreq) / sampleRate;

      // Soft attack & release envelope
      const attack = Math.min(1, t / 0.08);
      const release = Math.min(1, (n.len - t) / 0.08);
      const env = attack * release;

      // Vocal formant (strong fundamental + 2nd harmonic, low 3rd harmonic)
      const val = (Math.sin(phase) * 0.75 + Math.sin(phase * 2) * 0.25 + Math.sin(phase * 3) * 0.08) * env * 0.35;
      data[startSample + i] += val;
    }
  }

  normalizeBuffer(data);
  return buffer;
}

/**
 * Generates Grand Piano Cadence (C -> G -> Am -> Em -> F -> G7 -> C)
 */
function generatePianoProgression(ctx: AudioContext, sampleRate: number): AudioBuffer {
  const duration = 10.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const chords = [
    { notes: [36, 48, 52, 55, 60], start: 0.1, duration: 1.3 },  // C
    { notes: [43, 47, 50, 55, 59], start: 1.5, duration: 1.3 },  // G
    { notes: [45, 48, 52, 57, 60], start: 2.9, duration: 1.3 },  // Am
    { notes: [40, 47, 52, 55, 59], start: 4.3, duration: 1.3 },  // Em
    { notes: [41, 48, 53, 57, 60], start: 5.7, duration: 1.3 },  // F
    { notes: [43, 47, 50, 53, 59], start: 7.1, duration: 1.3 },  // G7
    { notes: [36, 48, 55, 60, 64], start: 8.5, duration: 1.4 },  // C (resolved)
  ];

  for (const chord of chords) {
    chord.notes.forEach((midi) => {
      const freq = midiToHz(midi);
      const startSample = Math.floor(chord.start * sampleRate);
      const strLength = Math.min(numSamples - startSample, Math.floor(chord.duration * sampleRate));

      for (let i = 0; i < strLength; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * (1.2 + (midi - 36) * 0.03));
        const val =
          (Math.sin(2 * Math.PI * freq * t) * 0.6 +
            Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
            Math.sin(2 * Math.PI * freq * 3 * t) * 0.12 +
            Math.sin(2 * Math.PI * freq * 4 * t) * 0.05) *
          decay *
          0.14;

        data[startSample + i] += val;
      }
    });
  }

  normalizeBuffer(data);
  return buffer;
}

/**
 * Generates clean ascending scale C4 to C5
 */
function generateCleanScale(ctx: AudioContext, sampleRate: number): AudioBuffer {
  const duration = 6.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5
  const noteDuration = 0.65;

  scaleMidis.forEach((midi, idx) => {
    const freq = midiToHz(midi);
    const startSample = Math.floor((0.2 + idx * noteDuration) * sampleRate);
    const length = Math.floor(0.55 * sampleRate);

    for (let i = 0; i < length && startSample + i < numSamples; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.03);
      const release = Math.min(1, (0.55 - t) / 0.04);
      const env = attack * release;

      const val = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
      data[startSample + i] += val;
    }
  });

  normalizeBuffer(data);
  return buffer;
}

function normalizeBuffer(data: Float32Array) {
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > max) max = abs;
  }
  if (max > 0) {
    const gain = 0.9 / max;
    for (let i = 0; i < data.length; i++) {
      data[i] *= gain;
    }
  }
}
