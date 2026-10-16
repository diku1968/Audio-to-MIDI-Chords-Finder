import React, { useState } from 'react';
import { Cpu, Zap, Activity, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const AudioBenchmarkSimulator: React.FC = () => {
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [bufferSize, setBufferSize] = useState<number>(1024);
  const [hopSize, setHopSize] = useState<number>(256);

  // Computations
  const bufferLatencyMs = (bufferSize / sampleRate) * 1000;
  const hopLatencyMs = (hopSize / sampleRate) * 1000;
  // Lowest detectable frequency in YIN requires half-window
  const minFreqYin = sampleRate / (bufferSize / 2);
  // Frequency resolution in FFT
  const freqResolution = sampleRate / bufferSize;

  // Estimate Android CPU usage for various algorithms
  const getAlgoStats = (algo: 'yin' | 'pyin' | 'crepe' | 'spice' | 'chroma') => {
    switch (algo) {
      case 'yin':
        return {
          name: 'YIN Algorithm (Native C++)',
          type: 'Analytical Time-Domain DSP',
          accuracy: '94% (Monophonic)',
          cpuLoad: bufferSize <= 1024 ? '3.2%' : '6.8%',
          latency: `${bufferLatencyMs.toFixed(1)} ms`,
          memoryAlloc: '0 bytes (Preallocated 8 KB buffer)',
          polyphonic: 'No (Monophonic only)',
          recommendation: 'Highly Recommended for vocal humming & solo instruments on Android NDK.',
          status: 'success',
        };
      case 'pyin':
        return {
          name: 'pYIN (Probabilistic YIN + HMM)',
          type: 'HMM Multi-Candidate Search',
          accuracy: '97% (Vocal & Humming)',
          cpuLoad: '14.5%',
          latency: `${(bufferLatencyMs + hopLatencyMs * 4).toFixed(1)} ms (Viterbi lag)`,
          memoryAlloc: '48 KB scratch memory',
          polyphonic: 'No',
          recommendation: 'High accuracy for offline studio pitch correction; slight latency lag for real-time.',
          status: 'warning',
        };
      case 'crepe':
        return {
          name: 'CREPE (TFLite CNN Model)',
          type: 'Deep Neural Network (5 Conv Layers)',
          accuracy: '98.5% (High Noise Resistance)',
          cpuLoad: '28% - 45% (Heavy without GPU/NNAPI)',
          latency: '35 - 55 ms inference per hop',
          memoryAlloc: '1.8 MB model weights + 12 MB tensor arena',
          polyphonic: 'No',
          recommendation: 'Too battery-intensive for continuous live streaming; best for offline processing.',
          status: 'danger',
        };
      case 'spice':
        return {
          name: 'Google SPICE (TFLite Mobile)',
          type: 'Auto-encoder Neural Estimator',
          accuracy: '91% (Singing Voice Focus)',
          cpuLoad: '11% with NNAPI delegate',
          latency: '24 ms',
          memoryAlloc: '3.2 MB TFLite buffer',
          polyphonic: 'No',
          recommendation: 'Good alternative if pre-trained neural model is preferred over C++ DSP.',
          status: 'warning',
        };
      case 'chroma':
        return {
          name: '12-Bin Chromagram (FFT + Filterbank)',
          type: 'Frequency-Domain MIR Template Matching',
          accuracy: '92% (Triads & 7th Chords)',
          cpuLoad: '3.8% (NEON-accelerated FFT)',
          latency: `${bufferLatencyMs.toFixed(1)} ms`,
          memoryAlloc: '0 bytes (Preallocated FFT twiddle LUT)',
          polyphonic: 'Yes (Full Polyphonic Chords)',
          recommendation: 'Industry Standard for real-time chord detection on Android.',
          status: 'success',
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">
            DSP Parameter Calculator &amp; Algorithm Comparison Benchmark
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Compute buffer latency, minimum detectable pitch, and evaluate algorithm trade-offs (YIN vs pYIN vs CREPE vs Chromagram) for Android low-latency audio pipelines.
        </p>
      </div>

      {/* Interactive Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Sample Rate ($f_s$): <span className="text-cyan-400 font-mono">{sampleRate} Hz</span>
          </label>
          <select
            value={sampleRate}
            onChange={(e) => setSampleRate(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 font-mono"
          >
            <option value={16000}>16,000 Hz (TFLite Speech/Voice standard)</option>
            <option value={22050}>22,050 Hz (Half Bandwidth / Low CPU)</option>
            <option value={44100}>44,100 Hz (CD Standard / Studio Audio)</option>
            <option value={48000}>48,000 Hz (Android Native Device Native Clock)</option>
          </select>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Note: 48 kHz is the native hardware sample rate on 95% of modern Android hardware. Matching 48kHz avoids OS resampler latency!
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Buffer Size ($W$): <span className="text-cyan-400 font-mono">{bufferSize} samples</span>
          </label>
          <select
            value={bufferSize}
            onChange={(e) => setBufferSize(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 font-mono"
          >
            <option value={512}>512 samples (Ultra-low latency, higher $f_{"{min}"}$)</option>
            <option value={1024}>1024 samples (Optimal sweet spot for vocals &amp; guitar)</option>
            <option value={2048}>2048 samples (Better bass resolution, higher latency)</option>
            <option value={4096}>4096 samples (High frequency resolution for chord FFT)</option>
          </select>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Window size determines minimum detectable pitch: f_min ≈ f_s / (W/2)
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Hop Size ($H$): <span className="text-cyan-400 font-mono">{hopSize} samples</span>
          </label>
          <select
            value={hopSize}
            onChange={(e) => setHopSize(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2 font-mono"
          >
            <option value={128}>128 samples (Very high update rate: {Math.round(sampleRate / 128)} FPS)</option>
            <option value={256}>256 samples (Balanced: {Math.round(sampleRate / 256)} FPS)</option>
            <option value={512}>512 samples (Power saving: {Math.round(sampleRate / 512)} FPS)</option>
          </select>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Hop size controls refresh rate of pitch &amp; chord detections.
          </span>
        </div>
      </div>

      {/* Calculated Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Buffer Latency</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">{bufferLatencyMs.toFixed(1)} ms</div>
          <span className="text-[10px] text-slate-500">Time window required to fill buffer</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Update Hop Interval</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">{hopLatencyMs.toFixed(1)} ms</div>
          <span className="text-[10px] text-slate-500">{(1000 / hopLatencyMs).toFixed(0)} updates/second</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Min Detectable Pitch</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">
            {minFreqYin.toFixed(1)} Hz
          </div>
          <span className="text-[10px] text-slate-500">
            {minFreqYin <= 82 ? 'Guitar E2 supported' : minFreqYin <= 130 ? 'C3 and above supported' : 'High notes only'}
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>FFT Bin Resolution</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-300">
            {freqResolution.toFixed(1)} Hz
          </div>
          <span className="text-[10px] text-slate-500">Chroma frequency discretization</span>
        </div>
      </div>

      {/* Algorithm Matrix Comparison */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Comparative Analysis: Algorithms for Android Implementation
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950">
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">CPU Load</th>
                <th className="py-2.5 px-3">Zero-Alloc Feasibility</th>
                <th className="py-2.5 px-3">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(['yin', 'chroma', 'pyin', 'spice', 'crepe'] as const).map((key) => {
                const s = getAlgoStats(key);
                return (
                  <tr key={key} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                      {s.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : s.status === 'warning' ? (
                        <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span>{s.name}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{s.type}</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">{s.accuracy}</td>
                    <td className="py-2 px-3 text-cyan-300">{s.latency}</td>
                    <td className="py-2 px-3 text-amber-300">{s.cpuLoad}</td>
                    <td className="py-2 px-3 text-slate-300">{s.memoryAlloc}</td>
                    <td className="py-2 px-3 text-[11px] text-slate-300 max-w-xs">{s.recommendation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
