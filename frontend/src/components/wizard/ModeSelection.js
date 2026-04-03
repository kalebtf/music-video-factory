import React from 'react';
import { Wand2, ImageIcon, Film, Sparkles, Upload, Search } from 'lucide-react';

export default function ModeSelection({ onSelect }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#f8f8f8] mb-3">
            How do you want to create?
          </h1>
          <p className="text-[#8b8b99] text-base sm:text-lg">
            Choose your creative path — you can always switch later
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* AI Mode */}
          <button
            onClick={() => onSelect('ai')}
            className="group relative bg-[#141418] border-2 border-[#2a2a35] rounded-2xl p-8 text-left hover:border-[#e94560] transition-all duration-300 focus:outline-none focus:border-[#e94560]"
            data-testid="mode-ai"
          >
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-[#e94560]/15 text-[#e94560] text-[11px] font-medium rounded-full tracking-wide uppercase">
              AI Powered
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-[#e94560]/20 to-[#e94560]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <Wand2 className="w-7 h-7 text-[#e94560]" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[#f8f8f8] mb-2">AI Mode</h2>
            <p className="text-[#8b8b99] text-sm leading-relaxed mb-6">
              AI analyzes your lyrics and generates original images, animations, and text hooks automatically.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-[#8b8b99]">
                <Sparkles className="w-4 h-4 text-[#e94560]" />
                <span>AI-generated visuals from your lyrics</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-[#8b8b99]">
                <Film className="w-4 h-4 text-[#e94560]" />
                <span>Automatic animation &amp; image generation</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-[#8b8b99]">
                <Wand2 className="w-4 h-4 text-[#e94560]" />
                <span>Smart hooks &amp; visual concepts</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <span className="text-[#e94560] text-sm font-medium group-hover:underline">
                Start with AI &rarr;
              </span>
            </div>
          </button>

          {/* Library Mode */}
          <button
            onClick={() => onSelect('library')}
            className="group relative bg-[#141418] border-2 border-[#2a2a35] rounded-2xl p-8 text-left hover:border-[#00b4d8] transition-all duration-300 focus:outline-none focus:border-[#00b4d8]"
            data-testid="mode-library"
          >
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-[#00b4d8]/15 text-[#00b4d8] text-[11px] font-medium rounded-full tracking-wide uppercase">
              My Media
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-[#00b4d8]/20 to-[#00b4d8]/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-7 h-7 text-[#00b4d8]" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[#f8f8f8] mb-2">Library / My Media</h2>
            <p className="text-[#8b8b99] text-sm leading-relaxed mb-6">
              Use stock footage, your own photos and videos. Full control over every visual.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-[#8b8b99]">
                <Search className="w-4 h-4 text-[#00b4d8]" />
                <span>Search stock photos &amp; videos (Pexels)</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-[#8b8b99]">
                <Upload className="w-4 h-4 text-[#00b4d8]" />
                <span>Upload your own images &amp; videos</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-[#8b8b99]">
                <Film className="w-4 h-4 text-[#00b4d8]" />
                <span>Optional animation for still images</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <span className="text-[#00b4d8] text-sm font-medium group-hover:underline">
                Start with My Media &rarr;
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
