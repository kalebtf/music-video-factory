import React, { useEffect, useRef, useState } from 'react';
import { Waves, Wand2 } from 'lucide-react';

export default function Step2SelectClimax({ project, updateProject }) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Dynamically import WaveSurfer
    const initWaveSurfer = async () => {
      if (!project.audioUrl || !waveformRef.current) return;

      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;
        const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.js')).default;

        // Destroy existing instance
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }

        const ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#8b8b99',
          progressColor: '#e94560',
          cursorColor: '#f8f8f8',
          height: 120,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          responsive: true,
          normalize: true,
        });

        const regions = ws.registerPlugin(RegionsPlugin.create());

        ws.on('ready', () => {
          const dur = ws.getDuration();
          setDuration(dur);
          setIsReady(true);

          // Create initial region
          const start = project.climaxStart || 0;
          const end = Math.min(project.climaxEnd || 30, dur);

          const region = regions.addRegion({
            start,
            end,
            color: 'rgba(233, 69, 96, 0.3)',
            drag: true,
            resize: true,
          });
          regionRef.current = region;

          region.on('update-end', () => {
            updateProject({
              climaxStart: region.start,
              climaxEnd: region.end,
            });
          });
        });

        ws.load(project.audioUrl);
        wavesurferRef.current = ws;
      } catch (err) {
        console.error('Failed to initialize WaveSurfer:', err);
      }
    };

    initWaveSurfer();

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [project.audioUrl]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const regionDuration = project.climaxEnd - project.climaxStart;

  const handleAutoDetect = () => {
    // Placeholder: would connect to backend AI
    // For now, just set a reasonable middle portion
    if (duration > 0) {
      const start = Math.max(0, duration * 0.3);
      const end = Math.min(duration, start + 40);
      
      updateProject({ climaxStart: start, climaxEnd: end });
      
      if (regionRef.current) {
        regionRef.current.setOptions({ start, end });
      }
    }
  };

  if (!project.audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Waves className="w-16 h-16 text-[#2a2a35] mb-4" />
        <h3 className="font-heading text-xl font-semibold text-[#f8f8f8] mb-2">
          No Audio Uploaded
        </h3>
        <p className="text-[#8b8b99]">
          Go back to Step 1 and upload an audio file to select the climax.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Select Climax
        </h2>
        <p className="text-[#8b8b99]">
          Choose the 30-50 second highlight of your song for the video
        </p>
      </div>

      {/* Waveform */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <div
          ref={waveformRef}
          className="w-full bg-[#0c0c0f] rounded-lg p-4"
          data-testid="waveform"
        />

        {/* Time Display */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="bg-[#0c0c0f] px-4 py-2 rounded-lg border border-[#2a2a35]">
            <span className="text-[#8b8b99] text-sm">Start: </span>
            <span className="font-heading font-semibold text-[#f8f8f8]" data-testid="climax-start">
              {formatTime(project.climaxStart)}
            </span>
          </div>
          <div className="bg-[#0c0c0f] px-4 py-2 rounded-lg border border-[#2a2a35]">
            <span className="text-[#8b8b99] text-sm">End: </span>
            <span className="font-heading font-semibold text-[#f8f8f8]" data-testid="climax-end">
              {formatTime(project.climaxEnd)}
            </span>
          </div>
          <div className="bg-[#0c0c0f] px-4 py-2 rounded-lg border border-[#2a2a35]">
            <span className="text-[#8b8b99] text-sm">Duration: </span>
            <span className={`font-heading font-semibold ${
              regionDuration >= 30 && regionDuration <= 50 ? 'text-[#10b981]' : 'text-[#f59e0b]'
            }`} data-testid="climax-duration">
              {regionDuration.toFixed(0)}s
            </span>
          </div>
        </div>

        {/* Duration Warning */}
        {(regionDuration < 30 || regionDuration > 50) && (
          <p className="text-center text-[#f59e0b] text-sm mt-4">
            {regionDuration < 30 ? 'Selection is too short (min 30s)' : 'Selection is too long (max 50s)'}
          </p>
        )}
      </div>

      {/* Auto-detect Button */}
      <div className="flex justify-center">
        <button
          onClick={handleAutoDetect}
          disabled={!isReady}
          className="flex items-center gap-2 px-6 py-3 bg-[#141418] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all disabled:opacity-50"
          data-testid="auto-detect-button"
        >
          <Wand2 className="w-5 h-5 text-[#e94560]" />
          Auto-detect Climax
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4">
        <h4 className="font-medium text-[#f8f8f8] mb-2">How to use:</h4>
        <ul className="text-sm text-[#8b8b99] space-y-1">
          <li>• Drag the highlighted region to move the selection</li>
          <li>• Drag the edges to resize the selection</li>
          <li>• Aim for 30-50 seconds of the most impactful part of your song</li>
          <li>• Use "Auto-detect" to let AI find the climax (coming soon)</li>
        </ul>
      </div>
    </div>
  );
}
