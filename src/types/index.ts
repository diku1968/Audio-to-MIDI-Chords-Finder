export interface MidiNoteEvent {
  id: string;
  noteNumber: number; // 0-127 (e.g. 60 = C4)
  noteName: string;   // e.g. "C4"
  frequency: number;  // Hz
  startTime: number;  // seconds
  duration: number;   // seconds
  velocity: number;   // 0-127
  centsOff: number;   // -50 to +50 cents
  active: boolean;
}

export interface DetectedChord {
  id: string;
  chordName: string;     // e.g. "C Maj", "A min", "G7"
  root: string;          // e.g. "C"
  quality: string;       // e.g. "Major", "Minor", "7th", "sus4"
  notes: string[];       // e.g. ["C", "E", "G"]
  bassNote?: string;     // for slash chords like "C/E"
  confidence: number;    // 0.0 - 1.0
  chroma: number[];      // 12-element array [C, C#, D, D#, E, F, F#, G, G#, A, A#, B]
  timestamp: number;     // seconds
  duration?: number;
}

export interface PitchDetectionResult {
  frequency: number; // Hz (0 if unvoiced/silence)
  confidence: number; // 0.0 - 1.0
  midiNote: number;   // 0-127
  noteName: string;
  centsOff: number;   // -50 to +50
  rms: number;        // audio energy
}

export type AudioInputMode = 'mic' | 'file' | 'preset';

export type PresetSong = 'guitar_chords' | 'vocal_humming' | 'piano_cadence' | 'chromatic_scale';

export interface DspConfig {
  sampleRate: number;
  bufferSize: number;       // e.g. 1024, 2048
  hopSize: number;          // e.g. 256, 512
  yinThreshold: number;     // e.g. 0.15
  noiseGateDb: number;      // e.g. -45 dB
  chordSensitivity: number; // 0.4 - 0.9
  minPitchHz: number;       // e.g. 60 Hz (B1)
  maxPitchHz: number;       // e.g. 1000 Hz (B5)
  auditionSynth: boolean;   // play synthesized MIDI in real-time
}
