import React, { useState } from 'react';
import { DollarSign, ChevronUp, ChevronDown, ExternalLink, X } from 'lucide-react';

interface AdMobBottomBannerProps {
  onOpenAdMobStudio?: () => void;
}

const AD_ROTATIONS = [
  {
    title: 'Focusrite Scarlett 2i2 4th Gen',
    tagline: 'Ultra-low latency USB audio interface for mobile & studio recording.',
    cta: 'Explore',
  },
  {
    title: 'Moog Synthesizer VST Bundle',
    tagline: 'Classic analog polyphonic sounds for your converted MIDI tracks.',
    cta: 'Shop Now',
  },
  {
    title: 'Cubase 14 Mobile Edition',
    tagline: 'Record, edit, and arrange MIDI tracks directly on Android.',
    cta: 'Learn More',
  },
];

export const AdMobBottomBanner: React.FC<AdMobBottomBannerProps> = ({ onOpenAdMobStudio }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentAdIdx, setCurrentAdIdx] = useState<number>(0);

  const ad = AD_ROTATIONS[currentAdIdx];

  const handleNextAd = () => {
    setCurrentAdIdx((prev) => (prev + 1) % AD_ROTATIONS.length);
  };

  if (isCollapsed) {
    return (
      <div className="fixed bottom-2 right-4 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[11px] shadow-lg transition-all cursor-pointer font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Show AdMob Banner</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-40 w-full bg-[#080d17]/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: AdMob Badge & Info */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[9px]">
            <span>AdMob</span>
            <span className="text-[8px] opacity-80">BANNER</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            ca-app-pub-3940256099942544/9214589741
          </span>
        </div>

        {/* Center: Simulated Ad Sponsor Content */}
        <div className="flex-1 flex items-center justify-center gap-3 overflow-hidden text-center sm:text-left">
          <div className="truncate">
            <span className="text-xs font-bold text-slate-200 mr-2">{ad.title}</span>
            <span className="text-xs text-slate-400 hidden md:inline">{ad.tagline}</span>
          </div>
          <button
            onClick={handleNextAd}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
          >
            {ad.cta}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenAdMobStudio && (
            <button
              onClick={onOpenAdMobStudio}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 hidden lg:inline cursor-pointer"
            >
              AdMob Studio
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Minimize Ad"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
