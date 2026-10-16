import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Music,
  Zap,
  ShieldCheck,
  Smartphone,
  Download,
  Sliders,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { AudioEngineView } from './components/AudioEngineView';
import { AndroidArchitectureHub } from './components/AndroidArchitectureHub';
import { AudioBenchmarkSimulator } from './components/AudioBenchmarkSimulator';
import { AndroidLayoutStudio } from './components/AndroidLayoutStudio';
import { AdMobStudio } from './components/AdMobStudio';
import { AdMobBottomBanner } from './components/AdMobBottomBanner';

type AppTab = 'workbench' | 'layout' | 'admob' | 'architecture' | 'benchmark';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('admob');

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#090e18]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white">
                  Audio-to-MIDI &amp; Chords Finder
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  AdMob + DSP Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-Time Pitch Tracking (YIN), 12-Bin Chromagram Chord Recognition, Oboe NDK Pipeline &amp; AdMob Ads
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap">
            <button
              onClick={() => setActiveTab('admob')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'admob'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>AdMob Ads Center</span>
            </button>

            <button
              onClick={() => setActiveTab('layout')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'layout'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Layout Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('workbench')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'workbench'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live DSP Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>C++ NDK Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'benchmark'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Benchmark</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Quick Highlights Tech Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => setActiveTab('admob')}
            className="bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/60 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-left transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-amber-400 font-mono font-bold">MONETIZATION</div>
              <div className="font-semibold text-slate-200">Google AdMob SDK</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-left transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-mono">UI PARADIGM</div>
              <div className="font-semibold text-slate-200">Compose &amp; XML</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-left transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-mono">AUDIO ENGINE</div>
              <div className="font-semibold text-slate-200">Google Oboe C++</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('workbench')}
            className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-left transition-colors cursor-pointer"
          >
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-mono">PITCH TRACKER</div>
              <div className="font-semibold text-slate-200">YIN Algorithm</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('workbench')}
            className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-left transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-mono">CHORD FINDER</div>
              <div className="font-semibold text-slate-200">12-Bin Chromagram</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('workbench')}
            className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-left transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-mono">EXPORT FORMAT</div>
              <div className="font-semibold text-slate-200">Type 0 MIDI (.mid)</div>
            </div>
          </button>
        </div>

        {/* Tab 1: AdMob Ads Center */}
        {activeTab === 'admob' && <AdMobStudio />}

        {/* Tab 2: Android Layout Studio */}
        {activeTab === 'layout' && <AndroidLayoutStudio />}

        {/* Tab 3: Live DSP Audio Engine Workbench */}
        {activeTab === 'workbench' && <AudioEngineView />}

        {/* Tab 4: Senior Android Architecture Blueprint & Ready-to-copy code */}
        {activeTab === 'architecture' && <AndroidArchitectureHub />}

        {/* Tab 5: DSP Latency & Algorithm Benchmark */}
        {activeTab === 'benchmark' && <AudioBenchmarkSimulator />}
      </main>

      {/* Persistent AdMob Adaptive Banner at the Bottom */}
      <AdMobBottomBanner onOpenAdMobStudio={() => setActiveTab('admob')} />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060910] py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Audio-to-MIDI &amp; Chords Finder • Senior Android DSP &amp; Mobile Monetization Engine
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Sample Rate: 48 kHz (AAudio)</span>
            <span>AdMob SDK 23.6.0</span>
            <span>GDPR UMP Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


