import React, { useState } from 'react';
import { Download, FileText, Music, Play, Check, ShieldCheck, Sparkles, X } from 'lucide-react';
import { MidiNoteEvent, DetectedChord } from '../types';
import { createStandardMidiFile, downloadMidiFile } from '../dsp/midiWriter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: MidiNoteEvent[];
  chords: DetectedChord[];
  onAuditionNotes?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  notes,
  chords,
  onAuditionNotes,
}) => {
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [adSimulated, setAdSimulated] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(3);
  const [exportBpm, setExportBpm] = useState(120);

  if (!isOpen) return null;

  // Generate Lead Sheet Text
  const generateLeadSheetText = (): string => {
    let output = `========================================================\n`;
    output += `AUDIO-TO-MIDI & CHORDS FINDER - TRANSCRIPTION EXPORT\n`;
    output += `Tempo: ${exportBpm} BPM | Total Notes: ${notes.length} | Chords: ${chords.length}\n`;
    output += `========================================================\n\n`;

    output += `--- DETECTED CHORD PROGRESSION ---\n`;
    if (chords.length === 0) {
      output += `(No chords detected)\n`;
    } else {
      let line = '';
      chords.forEach((c, i) => {
        const timeSec = c.timestamp.toFixed(1);
        const item = `[${timeSec}s: ${c.chordName}] `;
        line += item;
        if ((i + 1) % 4 === 0) {
          output += line + '\n';
          line = '';
        }
      });
      if (line) output += line + '\n';
    }

    output += `\n--- DETECTED MIDI NOTES SEQUENCE ---\n`;
    output += `Time(s)   Note   MIDI#  Pitch(Hz)   Cents   Vel   Duration\n`;
    output += `--------------------------------------------------------\n`;
    notes.slice(0, 100).forEach((n) => {
      const t = n.startTime.toFixed(2).padStart(6);
      const name = n.noteName.padEnd(6);
      const m = n.noteNumber.toString().padStart(4);
      const hz = n.frequency.toFixed(1).padStart(8);
      const cents = (n.centsOff >= 0 ? `+${n.centsOff}` : `${n.centsOff}`).padStart(6);
      const vel = n.velocity.toString().padStart(4);
      const dur = `${n.duration.toFixed(2)}s`.padStart(8);
      output += `${t}   ${name} ${m}  ${hz}Hz ${cents}c  ${vel}  ${dur}\n`;
    });
    if (notes.length > 100) {
      output += `... and ${notes.length - 100} more notes ...\n`;
    }

    return output;
  };

  const handleDownloadMidi = () => {
    const blob = createStandardMidiFile(notes, exportBpm);
    downloadMidiFile(blob, `transcription_${Date.now()}.mid`);
  };

  const handleCopyLeadSheet = () => {
    const text = generateLeadSheetText();
    navigator.clipboard.writeText(text);
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 2500);
  };

  const handleDownloadJson = () => {
    const data = {
      app: 'Audio-to-MIDI & Chords Finder',
      exportedAt: new Date().toISOString(),
      bpm: exportBpm,
      totalNotes: notes.length,
      totalChords: chords.length,
      chords,
      notes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio_transcription_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerAdMobRewardedSimulation = () => {
    setIsWatchingAd(true);
    let count = 3;
    setAdCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      setAdCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setIsWatchingAd(false);
        setAdSimulated(true);
        handleDownloadMidi();
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Export Converted MIDI &amp; Sheet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400">Total MIDI Notes</span>
              <div className="text-2xl font-black font-mono text-cyan-400">{notes.length}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400">Detected Chords</span>
              <div className="text-2xl font-black font-mono text-amber-400">{chords.length}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400">Estimated Duration</span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {notes.length > 0
                  ? `${Math.max(...notes.map((n) => n.startTime + n.duration)).toFixed(1)}s`
                  : '0.0s'}
              </div>
            </div>
          </div>

          {/* Export Options Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Standard MIDI File (.mid) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Music className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-slate-100">Standard MIDI (.mid)</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Type 0 Standard MIDI File ready for import into FL Studio, Ableton, Logic Pro, Cubase, or Sibelius.
                </p>
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="text-slate-400">BPM:</span>
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={exportBpm}
                    onChange={(e) => setExportBpm(Number(e.target.value) || 120)}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center font-mono text-white text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleDownloadMidi}
                disabled={notes.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download .MID File
              </button>
            </div>

            {/* Visual Lead Sheet & Chords */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-amber-500/50 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-slate-100">Lead Sheet &amp; JSON</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Formatted text chord progression with timestamped note events, and raw JSON data.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyLeadSheet}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  {copiedSheet ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4" />}
                  {copiedSheet ? 'Copied!' : 'Copy Sheet'}
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  JSON Data
                </button>
              </div>
            </div>
          </div>

          {/* Android AdMob Monetization Simulation Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-800/60 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Android AdMob Monetization Simulator
                </div>
                <p className="text-xs text-slate-300">
                  Simulate Android AdMob Rewarded Video flow: pauses real-time audio thread cleanly, yields audio focus, shows simulated ad, and rewards user with unlocked high-res export.
                </p>
              </div>
              <button
                onClick={triggerAdMobRewardedSimulation}
                disabled={isWatchingAd}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-all cursor-pointer"
              >
                {isWatchingAd ? `Ad Playing (${adCountdown}s)...` : adSimulated ? 'Watch Again' : 'Test Rewarded Ad'}
              </button>
            </div>
            {isWatchingAd && (
              <div className="mt-3 p-3 bg-black/60 rounded-lg border border-indigo-500/40 text-center animate-pulse">
                <span className="text-xs text-indigo-300 font-mono">
                  [AdMob Rewarded Video Active] Audio engine safely paused via `AudioStream::requestPause()`... ({adCountdown}s remaining)
                </span>
              </div>
            )}
            {adSimulated && !isWatchingAd && (
              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Reward granted! Audio stream resumed with zero memory allocation and no audio clicks.
              </div>
            )}
          </div>

          {/* Lead Sheet Preview Box */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Text Sheet Preview</span>
              <span className="font-mono text-[11px]">Formatted ASCII Lead Sheet</span>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 h-36 overflow-y-auto">
              {generateLeadSheetText()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
