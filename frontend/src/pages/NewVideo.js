import React from 'react';
import { Link } from 'react-router-dom';
import { Video, ArrowLeft, Rocket } from 'lucide-react';

export default function NewVideo() {
  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-[#2a2a35] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all"
            data-testid="back-link"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-[#e94560]" strokeWidth={1.5} />
            <h1 className="font-heading text-lg font-bold text-[#f8f8f8]">New Video</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 md:p-8">
        <div className="min-h-[400px] border-2 border-dashed border-[#2a2a35] rounded-xl flex flex-col items-center justify-center text-center p-8">
          <Rocket className="w-16 h-16 text-[#e94560] mb-6" strokeWidth={1} />
          <h2 className="font-heading text-2xl font-semibold text-[#f8f8f8] mb-3">
            Coming Soon
          </h2>
          <p className="text-[#8b8b99] max-w-md">
            The video creation wizard will be available in the next phase.
            You'll be able to upload music, select templates, and generate
            stunning TikTok/Shorts videos.
          </p>
        </div>
      </main>
    </div>
  );
}
