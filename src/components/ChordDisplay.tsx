import React from 'react';
import { DetectedChord } from '../types';

interface ChordDisplayProps {
  currentChord: DetectedChord | null;
  recentChords: DetectedChord[];
  onSelectHistoricalChord?: (chord: DetectedChord) => void;
}

// Guitar chord voicings [string6 (E), string5 (A), string4 (D), string3 (G), string2 (B), string1 (e)]
// -1 = mute (x), 0 = open
const GUITAR_VOICINGS: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0],
  Cm: [-1, 3, 5, 5, 4, 3],
  C7: [-1, 3, 2, 3, 1, 0],
  D: [-1, -1, 0, 2, 3, 2],
  Dm: [-1, -1, 0, 2, 3, 1],
  D7: [-1, -1, 0, 2, 1, 2],
  E: [0, 2, 2, 1, 0, 0],
  Em: [0, 2, 2, 0, 0, 0],
  E7: [0, 2, 0, 1, 0, 0],
  F: [1, 3, 3, 2, 1, 1],
  Fm: [1, 3, 3, 1, 1, 1],
  G: [3, 2, 0, 0, 0, 3],
  Gm: [3, 5, 5, 3, 3, 3],
  G7: [3, 2, 0, 0, 0, 1],
  A: [-1, 0, 2, 2, 2, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  A7: [-1, 0, 2, 0, 2, 0],
  B: [-1, 2, 4, 4, 4, 2],
  Bm: [-1, 2, 4, 4, 3, 2],
  B7: [-1, 2, 1, 2, 0, 2],
};

const PIANO_OCTAVE = [
  { name: 'C', isBlack: false },
  { name: 'C#', isBlack: true },
  { name: 'D', isBlack: false },
  { name: 'D#', isBlack: true },
  { name: 'E', isBlack: false },
  { name: 'F', isBlack: false },
  { name: 'F#', isBlack: true },
  { name: 'G', isBlack: false },
  { name: 'G#', isBlack: true },
  { name: 'A', isBlack: false },
  { name: 'A#', isBlack: true },
  { name: 'B', isBlack: false },
];

export const ChordDisplay: React.FC<ChordDisplayProps> = ({
  currentChord,
  recentChords,
  onSelectHistoricalChord,
}) => {
  const activeChordName = currentChord?.chordName || 'Waiting...';
  const rawChordBase = currentChord?.chordName.split('/')[0] || '';
  const guitarVoicing = GUITAR_VOICINGS[rawChordBase];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <h3 className="font-semibold text-slate-200 text-sm tracking-wide">Real-time Chord Recognition</h3>
        </div>
        {currentChord && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Confidence:</span>
            <span className="font-mono font-bold text-emerald-400">
              {Math.round(currentChord.confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Main Chord Center Display */}
      <div className="py-4 flex flex-col md:flex-row items-center justify-around gap-4">
        {/* Chord Title & Quality */}
        <div className="text-center md:text-left">
          <div className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-baseline justify-center md:justify-start gap-2">
            <span className={currentChord ? 'text-amber-400' : 'text-slate-600'}>
              {currentChord ? currentChord.chordName : '— —'}
            </span>
            {currentChord?.bassNote && (
              <span className="text-lg font-mono text-cyan-400 font-semibold">
                (Bass: {currentChord.bassNote})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-center md:justify-start gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {currentChord?.quality || 'Awaiting Input'}
            </span>
            {currentChord && (
              <span className="text-slate-400">
                Notes:{' '}
                <strong className="text-slate-200 font-mono">
                  {currentChord.notes.join(' - ')}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Mini Piano Octave Visualizer */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-500 font-mono mb-1">PIANO VOICING</span>
          <div className="relative flex h-14 bg-slate-950 p-1 rounded-md border border-slate-800">
            {PIANO_OCTAVE.map((key) => {
              const isInChord = currentChord?.notes.includes(key.name);
              const isRoot = currentChord?.root === key.name;

              if (key.isBlack) {
                return (
                  <div
                    key={key.name}
                    className={`absolute z-10 w-3.5 h-8 -ml-2 rounded-b-sm border border-slate-900 transition-colors ${
                      isRoot
                        ? 'bg-amber-400 shadow-sm shadow-amber-500/50'
                        : isInChord
                        ? 'bg-cyan-400'
                        : 'bg-slate-800'
                    }`}
                    style={{
                      left:
                        key.name === 'C#'
                          ? '16px'
                          : key.name === 'D#'
                          ? '34px'
                          : key.name === 'F#'
                          ? '70px'
                          : key.name === 'G#'
                          ? '88px'
                          : '106px',
                    }}
                    title={key.name}
                  />
                );
              }

              return (
                <div
                  key={key.name}
                  className={`w-5 h-12 rounded-b-sm border-r border-slate-700/50 flex items-end justify-center pb-1 text-[8px] font-mono transition-colors ${
                    isRoot
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : isInChord
                      ? 'bg-cyan-300 text-slate-950 font-semibold'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  title={key.name}
                >
                  {isInChord ? key.name : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini Guitar Fretboard Box (if standard voicing available) */}
        {guitarVoicing ? (
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-mono mb-1">GUITAR FRETBOARD</span>
            <div className="bg-slate-950 p-1.5 rounded-md border border-slate-800 flex flex-col items-center">
              <div className="flex gap-1.5 text-[9px] font-mono text-slate-400">
                {guitarVoicing.map((fret, i) => (
                  <span
                    key={i}
                    className={`w-3 text-center ${
                      fret === -1 ? 'text-rose-400 font-bold' : fret === 0 ? 'text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {fret === -1 ? 'x' : fret}
                  </span>
                ))}
              </div>
              <div className="text-[8px] text-slate-500 mt-0.5 font-mono">E A D G B e</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Recent Chords History Strip */}
      <div className="mt-2 pt-2 border-t border-slate-800/60">
        <div className="text-[11px] text-slate-500 font-mono mb-1.5 flex items-center justify-between">
          <span>PROGRESSION HISTORY</span>
          <span>{recentChords.length} changes logged</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {recentChords.length === 0 ? (
            <span className="text-xs text-slate-600 italic py-1">
              Start recording or play a preset to detect chord changes...
            </span>
          ) : (
            recentChords.slice(-10).map((chord, idx) => (
              <button
                key={chord.id || idx}
                onClick={() => onSelectHistoricalChord?.(chord)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all border shrink-0 ${
                  idx === recentChords.slice(-10).length - 1
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {chord.chordName}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
