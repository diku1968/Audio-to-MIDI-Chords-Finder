import React, { useEffect, useRef } from 'react';
import { MidiNoteEvent } from '../types';

interface PianoRollProps {
  notes: MidiNoteEvent[];
  currentTime: number;
  activeNote: number | null;
  onNoteClick?: (midiNote: number) => void;
  height?: number;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6
const TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1;

export const PianoRoll: React.FC<PianoRollProps> = ({
  notes,
  currentTime,
  activeNote,
  onNoteClick,
  height = 220,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    const pianoWidth = 52;
    const rollWidth = width - pianoWidth;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, h);

    const keyHeight = h / TOTAL_KEYS;

    // Time window to display: 12 seconds total
    const timeWindow = 10.0;
    const timeScale = rollWidth / timeWindow; // pixels per second
    const visibleStartTime = Math.max(0, currentTime - 8.5);

    // Draw Piano Key Rows (Grid)
    for (let m = MAX_MIDI; m >= MIN_MIDI; m--) {
      const y = (MAX_MIDI - m) * keyHeight;
      const pitchClass = m % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      const isC = pitchClass === 0;

      // Grid line
      ctx.fillStyle = isBlack ? '#0c1220' : '#111827';
      ctx.fillRect(pianoWidth, y, rollWidth, keyHeight);

      if (isC) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fillRect(pianoWidth, y, rollWidth, 1);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(pianoWidth, y, rollWidth, 1);
      }

      // Piano Key Left Column
      const isActiveKey = activeNote === m;
      if (isActiveKey) {
        ctx.fillStyle = '#38bdf8'; // Active cyan
      } else if (isBlack) {
        ctx.fillStyle = '#1e293b'; // Black key
      } else {
        ctx.fillStyle = '#cbd5e1'; // White key
      }
      ctx.fillRect(0, y, pianoWidth - 2, keyHeight);

      // Key separator
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, y + keyHeight - 1, pianoWidth, 1);

      // Label C keys (e.g. C3, C4, C5)
      if (isC && keyHeight >= 3) {
        const octave = Math.floor(m / 12) - 1;
        ctx.fillStyle = isActiveKey ? '#0f172a' : '#475569';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(`C${octave}`, 6, y + keyHeight * 0.75);
      }
    }

    // Draw Time Grid Markers (every 1 second)
    const firstSec = Math.floor(visibleStartTime);
    for (let s = firstSec; s < visibleStartTime + timeWindow; s++) {
      const x = pianoWidth + (s - visibleStartTime) * timeScale;
      if (x >= pianoWidth && x <= width) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '8px monospace';
        ctx.fillText(`${s.toFixed(1)}s`, x + 3, h - 4);
      }
    }

    // Draw Detected MIDI Note Blocks
    for (const note of notes) {
      if (note.noteNumber < MIN_MIDI || note.noteNumber > MAX_MIDI) continue;

      const noteEnd = note.active ? currentTime : note.startTime + note.duration;
      // Skip if completely outside window
      if (noteEnd < visibleStartTime || note.startTime > visibleStartTime + timeWindow) {
        continue;
      }

      const x = pianoWidth + (note.startTime - visibleStartTime) * timeScale;
      const noteW = Math.max(3, (noteEnd - note.startTime) * timeScale);
      const y = (MAX_MIDI - note.noteNumber) * keyHeight;

      // Note gradient based on velocity & pitch
      const isCurrentlyActive = note.active;
      if (isCurrentlyActive) {
        ctx.fillStyle = '#06b6d4'; // bright cyan
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
      } else {
        // Gradient from amber/emerald
        ctx.fillStyle = note.centsOff > 10 ? '#f59e0b' : note.centsOff < -10 ? '#ec4899' : '#10b981';
        ctx.shadowBlur = 0;
      }

      // Draw rounded note rectangle
      ctx.beginPath();
      ctx.roundRect(Math.max(pianoWidth, x), y + 0.5, noteW - 1, keyHeight - 1, 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Note label if note is wide enough
      if (noteW > 28 && keyHeight > 8) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(note.noteName, Math.max(pianoWidth + 2, x + 3), y + keyHeight * 0.75);
      }
    }

    // Playhead line
    const playheadX = pianoWidth + (currentTime - visibleStartTime) * timeScale;
    if (playheadX >= pianoWidth && playheadX <= width) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }, [notes, currentTime, activeNote, height]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onNoteClick) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x <= 52) {
      const keyHeight = canvas.height / TOTAL_KEYS;
      const keyIndex = Math.floor(y / keyHeight);
      const clickedMidi = MAX_MIDI - keyIndex;
      onNoteClick(clickedMidi);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-semibold text-slate-300">Live MIDI Piano Roll</span>
          <span className="text-slate-500 font-mono">(C2 - C6 • Range 48 Semitones)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 rounded bg-emerald-500"></span> In-Tune
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 rounded bg-amber-500"></span> Sharp
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 rounded bg-pink-500"></span> Flat
          </span>
          <span className="text-slate-500">Click piano keys to audition</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={850}
        height={height}
        onClick={handleCanvasClick}
        className="w-full block cursor-pointer"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
