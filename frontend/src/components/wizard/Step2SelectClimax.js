import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Waves, Wand2, Play, Pause, Loader2 } from 'lucide-react';
import api from '../../lib/api';

export default function Step2SelectClimax({ project, updateProject, projectId, saveProject }) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');

  // Stop playback when it reaches the end marker
  const checkBounds = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isPlaying) return;
    const t = ws.getCurrentTime();
    setCurrentTime(t);
    if (t >= project.climaxEnd) {
      ws.pause();
      ws.setTime(project.climaxStart);
      setCurrentTime(project.climaxStart);
    }
  }, [isPlaying, project.climaxStart, project.climaxEnd]);

  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(checkBounds, 80);
    return () => clearInterval(iv);
  }, [isPlaying, checkBounds]);

  useEffect(() => {
    let cancelled = false;
    let ws = null;

    const initWaveSurfer = async () => {
      if (!project.audioUrl || !waveformRef.current) return;

      await new Promise(resolve => setTimeout(resolve, 100));
      if (cancelled) return;

      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;
        const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.js')).default;

        if (cancelled) return;

        if (wavesurferRef.current) {
          try { wavesurferRef.current.destroy(); } catch(e) {}
          wavesurferRef.current = null;
        }

        ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#4a4a5a',
          progressColor: '#e94560',
          cursorColor: '#f8f8f8',
          cursorWidth: 3,
          height: 140,
          barWidth: 3,
          barGap: 1,
          barRadius: 3,
          responsive: true,
          normalize: true,
        });

        const regions = ws.registerPlugin(RegionsPlugin.create());

        ws.on('ready', () => {
          if (cancelled) return;
          const dur = ws.getDuration();
          setDuration(dur);
          setIsReady(true);

          const start = project.climaxStart || 0;
          const end = Math.min(project.climaxEnd || 30, dur);

          const region = regions.addRegion({
            start,
            end,
            color: 'rgba(233, 69, 96, 0.25)',
            drag: true,
            resize: true,
          });
          regionRef.current = region;

          region.on('update-end', () => {
            updateProject({
              climaxStart: Math.round(region.start * 10) / 10,
              climaxEnd: Math.round(region.end * 10) / 10,
            });
          });
        });

        ws.on('audioprocess', () => {
          setCurrentTime(ws.getCurrentTime());
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));

        ws.on('interaction', () => {
          setCurrentTime(ws.getCurrentTime());
        });

        // Load audio
        try {
          if (project.audioUrl.startsWith('blob:') || project.audioUrl.startsWith('data:')) {
            if (!cancelled) ws.load(project.audioUrl);
          } else if (project.audioUrl.includes('/api/')) {
            const audioPath = project.audioUrl.replace(/.*\/api\//, '/');
            const token = localStorage.getItem('access_token');
            const apiBase = process.env.REACT_APP_BACKEND_URL;
            const res = await fetch(`${apiBase}/api${audioPath}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (cancelled) return;
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            ws.load(blobUrl);
          } else {
            if (!cancelled) ws.load(project.audioUrl);
          }
        } catch(e) {
          console.error('Failed to load audio:', e);
          if (!cancelled) {
            try { ws.load(project.audioUrl); } catch(e2) {}
          }
        }

        wavesurferRef.current = ws;
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to initialize WaveSurfer:', err);
        }
      }
    };

    initWaveSurfer();

    return () => {
      cancelled = true;
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch(e) {}
        wavesurferRef.current = null;
      }
    };
  }, [project.audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      return mins * 60 + secs;
    }
    return parseFloat(timeStr) || 0;
  };

  const regionDuration = project.climaxEnd - project.climaxStart;

  // ALWAYS play from climax start, stop at climax end
  const handlePlayPause = () => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (isPlaying) {
      ws.pause();
    } else {
      ws.setTime(project.climaxStart);
      setCurrentTime(project.climaxStart);
      ws.play();
    }
  };

  const handleAutoDetect = async () => {
    if (!projectId) return;

    setDetecting(true);
    setDetectionMessage('');

    try {
      const { data } = await api.post(`/audio/detect-climax/${projectId}`, {});

      updateProject({
        climaxStart: data.start,
        climaxEnd: data.end
      });

      if (regionRef.current) {
        regionRef.current.setOptions({ start: data.start, end: data.end });
      }

      setDetectionMessage(data.message);
    } catch (err) {
      console.error('Climax detection failed:', err);
      setDetectionMessage('Detection failed. Please select manually.');
    } finally {
      setDetecting(false);
    }
  };

  const handleStartChange = (e) => {
    const newStart = parseTime(e.target.value);
    if (newStart < project.climaxEnd && newStart >= 0) {
      updateProject({ climaxStart: newStart });
      if (regionRef.current) {
        regionRef.current.setOptions({ start: newStart });
      }
      // Seek to new start position
      if (wavesurferRef.current) {
        wavesurferRef.current.setTime(newStart);
        setCurrentTime(newStart);
      }
    }
  };

  const handleEndChange = (e) => {
    const newEnd = parseTime(e.target.value);
    if (newEnd > project.climaxStart && newEnd <= duration) {
      updateProject({ climaxEnd: newEnd });
      if (regionRef.current) {
        regionRef.current.setOptions({ end: newEnd });
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
          className="w-full bg-[#0c0c0f] rounded-lg p-4 cursor-pointer"
          style={{ minHeight: 140 }}
          data-testid="waveform"
        />

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 mt-5">
          <button
            onClick={handlePlayPause}
            disabled={!isReady}
            className="flex items-center gap-2 px-8 py-3 bg-[#e94560] text-white rounded-full hover:bg-[#f25a74] transition-all disabled:opacity-50 text-base font-medium"
            data-testid="play-pause-button"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" fill="white" />
                Play Selection
              </>
            )}
          </button>
        </div>

        {/* Current playback position */}
        <div className="text-center mt-3 text-sm text-[#8b8b99]">
          Playback: <span className="text-[#f8f8f8] font-mono">{formatTime(currentTime)}</span>
          <span className="mx-2 text-[#2a2a35]">|</span>
          Total: <span className="font-mono">{formatTime(duration)}</span>
        </div>

        {/* Start / End / Duration inputs */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-[#0c0c0f] px-4 py-3 rounded-lg border border-[#2a2a35] group focus-within:border-[#e94560] transition-all">
            <label className="text-[#8b8b99] text-xs block mb-1">Start</label>
            <input
              type="text"
              value={formatTime(project.climaxStart)}
              onChange={handleStartChange}
              className="w-full bg-transparent text-[#f8f8f8] font-heading font-semibold text-lg focus:outline-none"
              placeholder="0:00"
              data-testid="climax-start-input"
            />
          </div>
          <div className="bg-[#0c0c0f] px-4 py-3 rounded-lg border border-[#2a2a35] group focus-within:border-[#e94560] transition-all">
            <label className="text-[#8b8b99] text-xs block mb-1">End</label>
            <input
              type="text"
              value={formatTime(project.climaxEnd)}
              onChange={handleEndChange}
              className="w-full bg-transparent text-[#f8f8f8] font-heading font-semibold text-lg focus:outline-none"
              placeholder="0:30"
              data-testid="climax-end-input"
            />
          </div>
          <div className="bg-[#0c0c0f] px-4 py-3 rounded-lg border border-[#2a2a35]">
            <label className="text-[#8b8b99] text-xs block mb-1">Duration</label>
            <span className={`block font-heading font-semibold text-lg ${
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

      {/* Auto-detect */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleAutoDetect}
          disabled={!isReady || detecting}
          className="flex items-center gap-2 px-6 py-3 bg-[#141418] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all disabled:opacity-50"
          data-testid="auto-detect-button"
        >
          {detecting ? (
            <>
              <Loader2 className="w-5 h-5 text-[#e94560] animate-spin" />
              Analyzing audio...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 text-[#e94560]" />
              Auto-detect Climax
            </>
          )}
        </button>
        {detectionMessage && (
          <p className={`text-sm ${detectionMessage.includes('failed') ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
            {detectionMessage}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4">
        <h4 className="font-medium text-[#f8f8f8] mb-2">How to use:</h4>
        <ul className="text-sm text-[#8b8b99] space-y-1">
          <li>• <strong>Play Selection</strong> plays from Start and stops at End</li>
          <li>• Drag the highlighted region to move the selection</li>
          <li>• Drag the edges to resize the selection</li>
          <li>• Type exact start/end times (format: m:ss) — playback jumps immediately</li>
          <li>• Use "Auto-detect" to find the most energetic 40-second section</li>
        </ul>
      </div>
    </div>
  );
}
