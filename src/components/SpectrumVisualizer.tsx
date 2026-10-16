import React, { useEffect, useRef } from 'react';
import { PITCH_CLASSES } from '../dsp/chroma';

interface SpectrumVisualizerProps {
  analyserNode: AnalyserNode | null;
  chromaData: Float32Array | null;
  activeChordNotes?: string[];
  isListening: boolean;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  analyserNode,
  chromaData,
  activeChordNotes = [],
  isListening,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timeData = new Uint8Array(512);
    let freqData = new Uint8Array(256);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      if (analyserNode && isListening) {
        if (timeData.length !== analyserNode.fftSize) {
          timeData = new Uint8Array(analyserNode.fftSize);
          freqData = new Uint8Array(analyserNode.frequencyBinCount);
        }

        analyserNode.getByteTimeDomainData(timeData);
        analyserNode.getByteFrequencyData(freqData);

        // 1. Draw Spectrum in the background
        const barWidth = (width / freqData.length) * 2.5;
        for (let i = 0; i < freqData.length; i++) {
          const val = freqData[i];
          const percent = val / 255;
          const barHeight = percent * (height * 0.7);
          const x = i * barWidth;

          if (x > width) break;

          ctx.fillStyle = `rgba(56, 189, 248, ${percent * 0.25})`;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        }

        // 2. Draw Waveform Oscilloscope line
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();

        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      } else {
        // Idle flat line
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Audio Stream Inactive', width / 2, height / 2 - 10);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyserNode, isListening]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Waveform / Spectrum Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
          <span className="font-semibold text-slate-300">Audio Oscilloscope &amp; Spectrum</span>
          <span className="font-mono text-slate-500">FFT 2048 • Window Hanning</span>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          className="w-full h-[100px] rounded bg-slate-950 border border-slate-800"
        />
      </div>

      {/* 12-Bin Chromagram Radar/EQ */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
          <span className="font-semibold text-slate-300">12-Bin Pitch Class Profile (Chromagram)</span>
          <span className="font-mono text-slate-500">PCP (C to B)</span>
        </div>
        <div className="grid grid-cols-12 gap-1 h-[100px] items-end bg-slate-950 p-2 rounded border border-slate-800">
          {PITCH_CLASSES.map((pitchName, idx) => {
            const energy = chromaData ? Math.min(1.0, Math.max(0.04, chromaData[idx])) : 0.05;
            const isNoteActive = activeChordNotes.includes(pitchName);

            return (
              <div key={pitchName} className="flex flex-col items-center h-full justify-end group">
                <div
                  className={`w-full rounded-t transition-all duration-75 ${
                    isNoteActive
                      ? 'bg-amber-400 shadow-sm shadow-amber-500/50'
                      : energy > 0.4
                      ? 'bg-cyan-400'
                      : 'bg-slate-700'
                  }`}
                  style={{ height: `${Math.round(energy * 100)}%` }}
                  title={`${pitchName}: ${(energy * 100).toFixed(0)}%`}
                />
                <span
                  className={`text-[9px] font-mono mt-1 ${
                    isNoteActive
                      ? 'text-amber-400 font-bold'
                      : energy > 0.4
                      ? 'text-cyan-300 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {pitchName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
