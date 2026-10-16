import { MidiNoteEvent } from '../types';

/**
 * Encodes an integer into MIDI Variable-Length Quantity (VLQ) bytes.
 */
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value & 0x7f;

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

/**
 * Generates a valid Type 0 Standard MIDI File (.mid) binary Blob from detected note events.
 * @param notes Array of detected MIDI notes
 * @param bpm Beats per minute (default 120)
 * @param ticksPerQuarter Ticks per quarter note resolution (default 480)
 */
export function createStandardMidiFile(
  notes: MidiNoteEvent[],
  bpm: number = 120,
  ticksPerQuarter: number = 480
): Blob {
  // 1 beat = 60 / bpm seconds
  // 1 tick = (60 / bpm) / ticksPerQuarter seconds
  const secondsPerTick = 60 / (bpm * ticksPerQuarter);

  // Flatten notes into On and Off events sorted chronologically
  interface RawMidiEvent {
    tick: number;
    type: 'on' | 'off';
    note: number;
    velocity: number;
  }

  const rawEvents: RawMidiEvent[] = [];

  for (const n of notes) {
    if (n.duration <= 0.03) continue; // Skip micro-glitches < 30ms

    const startTick = Math.max(0, Math.round(n.startTime / secondsPerTick));
    const endTick = Math.max(startTick + 1, Math.round((n.startTime + n.duration) / secondsPerTick));

    rawEvents.push({
      tick: startTick,
      type: 'on',
      note: Math.max(0, Math.min(127, n.noteNumber)),
      velocity: Math.max(20, Math.min(127, n.velocity)),
    });

    rawEvents.push({
      tick: endTick,
      type: 'off',
      note: Math.max(0, Math.min(127, n.noteNumber)),
      velocity: 0,
    });
  }

  // Sort events by tick time (note off before note on at the same tick)
  rawEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  const trackBytes: number[] = [];

  // Track Name Meta Event (FF 03 len text...)
  const trackName = 'Audio-to-MIDI Track';
  trackBytes.push(0x00, 0xff, 0x03, trackName.length);
  for (let i = 0; i < trackName.length; i++) {
    trackBytes.push(trackName.charCodeAt(i));
  }

  // Set Tempo Meta Event (FF 51 03 tt tt tt)
  // Microseconds per quarter note = 60,000,000 / BPM
  const usPerQuarter = Math.round(60000000 / bpm);
  trackBytes.push(
    0x00,
    0xff,
    0x51,
    0x03,
    (usPerQuarter >> 16) & 0xff,
    (usPerQuarter >> 8) & 0xff,
    usPerQuarter & 0xff
  );

  // Time Signature Meta Event: 4/4 (FF 58 04 04 02 18 08)
  trackBytes.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Write Note Events with Delta Times
  let currentTick = 0;
  for (const ev of rawEvents) {
    const deltaTick = Math.max(0, ev.tick - currentTick);
    currentTick = ev.tick;

    const vlqDelta = encodeVLQ(deltaTick);
    for (const b of vlqDelta) {
      trackBytes.push(b);
    }

    if (ev.type === 'on') {
      // 0x90 = Note On, Channel 0
      trackBytes.push(0x90, ev.note, ev.velocity);
    } else {
      // 0x80 = Note Off, Channel 0
      trackBytes.push(0x80, ev.note, 0x00);
    }
  }

  // End of Track Meta Event (00 FF 2F 00)
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // Build Final MIDI File
  const fileBytes: number[] = [];

  // 1. Header Chunk: 'MThd' (4 bytes)
  fileBytes.push(0x4d, 0x54, 0x68, 0x64);
  // Header length: 6 bytes (4 bytes big-endian)
  fileBytes.push(0x00, 0x00, 0x00, 0x06);
  // Format: 0 (Single-track Type 0)
  fileBytes.push(0x00, 0x00);
  // Number of tracks: 1
  fileBytes.push(0x00, 0x01);
  // Division: ticks per quarter note
  fileBytes.push((ticksPerQuarter >> 8) & 0xff, ticksPerQuarter & 0xff);

  // 2. Track Chunk: 'MTrk' (4 bytes)
  fileBytes.push(0x4d, 0x54, 0x72, 0x6b);
  const trackLength = trackBytes.length;
  fileBytes.push(
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff
  );

  // Append track bytes
  for (const b of trackBytes) {
    fileBytes.push(b);
  }

  const uint8 = new Uint8Array(fileBytes);
  return new Blob([uint8], { type: 'audio/midi' });
}

/**
 * Triggers a browser download of the generated .mid file.
 */
export function downloadMidiFile(blob: Blob, filename: string = 'transcribed_notes.mid') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
