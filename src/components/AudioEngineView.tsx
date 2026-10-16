import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Square,
  Upload,
  Volume2,
  VolumeX,
  Trash2,
  Download,
  Music,
  Sliders,
  Sparkles,
  Gauge,
  Radio,
} from 'lucide-react';
import { MidiNoteEvent, DetectedChord, PitchDetectionResult, AudioInputMode } from '../types';
import { YinDetector } from '../dsp/yin';
import { ChromagramChordDetector } from '../dsp/chroma';
import { WebAudioSynth } from '../dsp/synth';
import { PRESET_LIST, generatePresetAudioBuffer } from '../dsp/audioPresets';
import { PianoRoll } from './PianoRoll';
import { ChordDisplay } from './ChordDisplay';
import { SpectrumVisualizer } from './SpectrumVisualizer';
import { ExportModal } from './ExportModal';

export const AudioEngineView: React.FC = () => {
  // Audio state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<AudioInputMode>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string>('guitar_chords');
  const [auditionSynth, setAuditionSynth] = useState<boolean>(true);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Real-time DSP output state
  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult>({
    frequency: 0,
    confidence: 0,
    midiNote: 0,
    noteName: '---',
    centsOff: 0,
    rms: 0,
  });
  const [currentChord, setCurrentChord] = useState<DetectedChord | null>(null);
  const [recentChords, setRecentChords] = useState<DetectedChord[]>([]);
  const [notesHistory, setNotesHistory] = useState<MidiNoteEvent[]>([]);
  const [activeMidiNote, setActiveMidiNote] = useState<number | null>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [chromaValues, setChromaValues] = useState<Float32Array | null>(null);

  // Settings & Sensitivity
  const [yinThreshold, setYinThreshold] = useState<number>(0.15);
  const [noiseGateDb, setNoiseGateDb] = useState<number>(-48);
  const [chordSensitivity, setChordSensitivity] = useState<number>(0.45);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Refs for audio pipeline
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const synthRef = useRef<WebAudioSynth | null>(null);
  const presetSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // DSP Engines
  const yinDetectorRef = useRef<YinDetector>(new YinDetector(44100, 2048, 0.15));
  const chordDetectorRef = useRef<ChromagramChordDetector>(new ChromagramChordDetector(44100, 2048));

  // Note segmentation tracking
  const activeNoteTrackerRef = useRef<{
    noteNumber: number;
    noteName: string;
    frequency: number;
    startTime: number;
    velocity: number;
    centsOff: number;
    framesCount: number;
  } | null>(null);
  const silenceFrameCountRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(0);

  // Initialize Web Audio Synth
  useEffect(() => {
    synthRef.current = new WebAudioSynth();
    return () => {
      stopAudioPipeline();
    };
  }, []);

  // Update synth mute state
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setMuted(!auditionSynth);
    }
  }, [auditionSynth]);

  // Update DSP detector configs
  useEffect(() => {
    if (audioCtxRef.current) {
      const sr = audioCtxRef.current.sampleRate;
      yinDetectorRef.current.updateConfig(sr, 2048, yinThreshold);
      chordDetectorRef.current.updateConfig(sr, 2048);
    }
  }, [yinThreshold]);

  const initAudioContext = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
      if (synthRef.current) {
        synthRef.current.init(audioCtxRef.current);
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const startAudioPipeline = async (mode: AudioInputMode = inputMode) => {
    setAudioError(null);
    try {
      const ctx = initAudioContext();
      stopAudioPipeline(); // Clean previous sources
      sessionStartTimeRef.current = ctx.currentTime;

      // Create AnalyserNode (FFT size 2048)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserNodeRef.current = analyser;

      if (mode === 'mic') {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
            channelCount: 1,
          },
        });
        mediaStreamRef.current = stream;
        const micSource = ctx.createMediaStreamSource(stream);
        micSource.connect(analyser);
        sourceNodeRef.current = micSource;
      } else if (mode === 'preset') {
        const buffer = generatePresetAudioBuffer(ctx, selectedPreset);
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = buffer;
        bufferSource.loop = true;

        // Also connect to audio output so user hears the preset playback
        const presetGain = ctx.createGain();
        presetGain.gain.setValueAtTime(0.35, ctx.currentTime);
        bufferSource.connect(presetGain);
        presetGain.connect(ctx.destination);

        bufferSource.connect(analyser);
        bufferSource.start();
        presetSourceRef.current = bufferSource;
        sourceNodeRef.current = bufferSource;
      }

      setIsListening(true);
      startDspProcessingLoop();
    } catch (err: any) {
      console.error('Audio pipeline failed:', err);
      setAudioError(err.message || 'Failed to initialize audio input.');
      setIsListening(false);
    }
  };

  const stopAudioPipeline = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (presetSourceRef.current) {
      try {
        presetSourceRef.current.stop();
        presetSourceRef.current.disconnect();
      } catch {}
      presetSourceRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // End any active MIDI note
    if (activeNoteTrackerRef.current) {
      finalizeActiveNote();
    }

    if (synthRef.current) {
      synthRef.current.stopAll();
    }

    setIsListening(false);
    setActiveMidiNote(null);
  };

  // Real-Time DSP Processing Loop
  const startDspProcessingLoop = () => {
    const analyser = analyserNodeRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !ctx) return;

    const timeBuffer = new Float32Array(analyser.fftSize);
    const freqBuffer = new Float32Array(analyser.frequencyBinCount);
    const noiseLinearFloor = Math.pow(10, noiseGateDb / 20);

    const processFrame = () => {
      if (!isListening && !analyserNodeRef.current) return;

      const now = ctx.currentTime;
      const relativeTime = now - sessionStartTimeRef.current;
      setCurrentTimeSec(relativeTime);

      analyser.getFloatTimeDomainData(timeBuffer);
      analyser.getFloatFrequencyData(freqBuffer);

      // 1. YIN Pitch Detection
      const pitchResult = yinDetectorRef.current.detect(timeBuffer, 65, 1100);

      // Noise gate check
      if (pitchResult.rms < noiseLinearFloor || pitchResult.confidence < 0.65) {
        pitchResult.frequency = 0;
        pitchResult.midiNote = 0;
        pitchResult.noteName = '---';
        pitchResult.confidence = 0;
      }

      setCurrentPitch(pitchResult);

      // 2. Note Segmentation State Machine (Pitch-to-MIDI events)
      handleNoteSegmentation(pitchResult, relativeTime);

      // 3. Chromagram & Chord Detection
      const { chroma, bassChroma } = chordDetectorRef.current.extractChromaFromFrequencies(
        freqBuffer,
        70,
        2800
      );
      setChromaValues(chroma);

      const detectedChord = chordDetectorRef.current.detectChord(
        chroma,
        bassChroma,
        relativeTime,
        chordSensitivity
      );

      if (detectedChord) {
        setCurrentChord((prev) => {
          // If chord changed or is first chord
          if (!prev || prev.chordName !== detectedChord.chordName) {
            setRecentChords((history) => [...history.slice(-19), detectedChord]);
            return detectedChord;
          }
          return { ...prev, confidence: detectedChord.confidence };
        });
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  // Pitch-to-MIDI Note Event Segmentation
  const handleNoteSegmentation = (pitch: PitchDetectionResult, time: number) => {
    const isVoiced = pitch.frequency > 0 && pitch.midiNote >= 24 && pitch.midiNote <= 96;

    if (isVoiced) {
      silenceFrameCountRef.current = 0;
      const active = activeNoteTrackerRef.current;

      if (!active) {
        // Start candidate note (needs 2 consecutive stable frames)
        activeNoteTrackerRef.current = {
          noteNumber: pitch.midiNote,
          noteName: pitch.noteName,
          frequency: pitch.frequency,
          startTime: time,
          velocity: Math.min(127, Math.max(30, Math.round(pitch.rms * 380))),
          centsOff: pitch.centsOff,
          framesCount: 1,
        };
      } else if (active.noteNumber === pitch.midiNote) {
        // Continuous same note
        active.framesCount++;
        if (active.framesCount === 3) {
          // Commit Note On
          setActiveMidiNote(active.noteNumber);
          if (auditionSynth && synthRef.current) {
            synthRef.current.noteOn(active.noteNumber, active.velocity);
          }
        }
      } else {
        // Pitch changed to a new note!
        finalizeActiveNote(time);
        activeNoteTrackerRef.current = {
          noteNumber: pitch.midiNote,
          noteName: pitch.noteName,
          frequency: pitch.frequency,
          startTime: time,
          velocity: Math.min(127, Math.max(30, Math.round(pitch.rms * 380))),
          centsOff: pitch.centsOff,
          framesCount: 1,
        };
      }
    } else {
      // Unvoiced or silence
      silenceFrameCountRef.current++;
      if (silenceFrameCountRef.current >= 4 && activeNoteTrackerRef.current) {
        finalizeActiveNote(time);
      }
    }
  };

  const finalizeActiveNote = (endTime?: number) => {
    const active = activeNoteTrackerRef.current;
    if (!active) return;

    const time = endTime || currentTimeSec;
    const duration = Math.max(0.04, time - active.startTime);

    if (active.framesCount >= 2 && duration >= 0.05) {
      const noteEvent: MidiNoteEvent = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        noteNumber: active.noteNumber,
        noteName: active.noteName,
        frequency: active.frequency,
        startTime: active.startTime,
        duration,
        velocity: active.velocity,
        centsOff: active.centsOff,
        active: false,
      };

      setNotesHistory((prev) => [...prev, noteEvent]);
    }

    if (synthRef.current) {
      synthRef.current.noteOff(active.noteNumber);
    }

    activeNoteTrackerRef.current = null;
    setActiveMidiNote(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const ctx = initAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        stopAudioPipeline();

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyserNodeRef.current = analyser;

        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.loop = false;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);

        bufferSource.connect(gainNode);
        gainNode.connect(ctx.destination);
        bufferSource.connect(analyser);

        sessionStartTimeRef.current = ctx.currentTime;
        bufferSource.start();
        sourceNodeRef.current = bufferSource;
        presetSourceRef.current = bufferSource;

        setInputMode('file');
        setIsListening(true);
        startDspProcessingLoop();
      } catch (err: any) {
        setAudioError('Failed to decode uploaded audio file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearHistory = () => {
    setNotesHistory([]);
    setRecentChords([]);
    setCurrentChord(null);
  };

  const handleAuditionNote = (midiNote: number) => {
    if (synthRef.current) {
      synthRef.current.noteOn(midiNote, 95);
      setTimeout(() => synthRef.current?.noteOff(midiNote), 400);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Audio Source & Transport Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Audio Input Selector Buttons */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 w-full lg:w-auto">
            <button
              onClick={() => {
                const wasRunning = isListening;
                setInputMode('preset');
                if (wasRunning) startAudioPipeline('preset');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                inputMode === 'preset'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>DSP Preset Loops</span>
            </button>

            <button
              onClick={() => {
                const wasRunning = isListening;
                setInputMode('mic');
                if (wasRunning) startAudioPipeline('mic');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                inputMode === 'mic'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Live Microphone</span>
            </button>

            <label
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                inputMode === 'file'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Audio File</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Preset Selector dropdown when in preset mode */}
          {inputMode === 'preset' && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <span className="text-xs text-slate-400 shrink-0">Preset:</span>
              <select
                value={selectedPreset}
                onChange={(e) => {
                  setSelectedPreset(e.target.value);
                  if (isListening) {
                    setTimeout(() => startAudioPipeline('preset'), 50);
                  }
                }}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium outline-none focus:border-cyan-500"
              >
                {PRESET_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Master Transport Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            {/* Start / Stop Listening Button */}
            <button
              onClick={() => {
                if (isListening) {
                  stopAudioPipeline();
                } else {
                  startAudioPipeline(inputMode);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isListening ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isListening ? 'Stop Stream' : 'Start Real-time Detection'}</span>
            </button>

            {/* Audition Synth Toggle */}
            <button
              onClick={() => setAuditionSynth(!auditionSynth)}
              className={`p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                auditionSynth
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title={auditionSynth ? 'Audition Synthesizer Active' : 'Audition Synthesizer Muted'}
            >
              {auditionSynth ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
              title="Clear Transcription History"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Export Modal Trigger */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export MIDI ({notesHistory.length})</span>
            </button>
          </div>
        </div>

        {/* Audio Error Alert if any */}
        {audioError && (
          <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center justify-between">
            <span>{audioError} (Check microphone permissions or choose Preset mode)</span>
            <button onClick={() => setAudioError(null)} className="text-rose-400 hover:text-white font-bold ml-2">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Real-Time Detection HUD: Pitch Tuner & Chord Finder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: YIN Pitch & Monophonic Tuner Meter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h3 className="font-semibold text-slate-200 text-sm">YIN Pitch &amp; Note-to-MIDI</h3>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              {currentPitch.frequency > 0 ? `${currentPitch.frequency.toFixed(1)} Hz` : 'Silent'}
            </span>
          </div>

          <div className="py-4 text-center">
            {/* Note Name Badge */}
            <div className="text-5xl font-black font-mono tracking-tight text-white mb-1">
              <span className={currentPitch.midiNote > 0 ? 'text-cyan-400' : 'text-slate-600'}>
                {currentPitch.noteName}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>MIDI Note: <strong className="text-slate-200 font-mono">{currentPitch.midiNote || '—'}</strong></span>
              <span>•</span>
              <span>Confidence: <strong className="text-emerald-400 font-mono">{(currentPitch.confidence * 100).toFixed(0)}%</strong></span>
            </div>

            {/* Cents Deviation Meter (-50 to +50 cents) */}
            <div className="mt-4 px-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>-50¢ (Flat)</span>
                <span className="text-emerald-400 font-bold">0¢ (In-Tune)</span>
                <span>+50¢ (Sharp)</span>
              </div>
              <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-500/80 -translate-x-1/2 z-10"></div>
                {/* Needle */}
                {currentPitch.midiNote > 0 && (
                  <div
                    className={`absolute top-0 bottom-0 w-2.5 -ml-1 rounded transition-all duration-75 ${
                      Math.abs(currentPitch.centsOff) <= 10
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                        : currentPitch.centsOff > 10
                        ? 'bg-amber-400'
                        : 'bg-pink-400'
                    }`}
                    style={{
                      left: `${Math.max(5, Math.min(95, 50 + currentPitch.centsOff))}%`,
                    }}
                  />
                )}
              </div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                {currentPitch.midiNote > 0 ? (
                  <span>
                    Offset: <strong className={Math.abs(currentPitch.centsOff) <= 10 ? 'text-emerald-400' : 'text-amber-400'}>
                      {currentPitch.centsOff > 0 ? `+${currentPitch.centsOff}` : currentPitch.centsOff} cents
                    </strong>
                  </span>
                ) : (
                  <span className="text-slate-600">Awaiting vocal hum or note...</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 flex items-center justify-between">
            <span>RMS Level: {(currentPitch.rms * 100).toFixed(1)}%</span>
            <span className="text-slate-400 font-mono">YIN Threshold: {yinThreshold}</span>
          </div>
        </div>

        {/* Center & Right Column: Real-time Chord Detection Display */}
        <div className="lg:col-span-2">
          <ChordDisplay
            currentChord={currentChord}
            recentChords={recentChords}
          />
        </div>
      </div>

      {/* Visualizers: Audio Oscilloscope Waveform & 12-Bin Chromagram */}
      <SpectrumVisualizer
        analyserNode={analyserNodeRef.current}
        chromaData={chromaValues}
        activeChordNotes={currentChord?.notes || []}
        isListening={isListening}
      />

      {/* Live Scrolling MIDI Piano Roll */}
      <PianoRoll
        notes={notesHistory}
        currentTime={currentTimeSec}
        activeNote={activeMidiNote}
        onNoteClick={handleAuditionNote}
        height={210}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notes={notesHistory}
        chords={recentChords}
      />
    </div>
  );
};
