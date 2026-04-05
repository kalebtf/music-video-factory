import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Waves, Wand2, Play, Pause, Loader2 } from 'lucide-react';
import api from '../../lib/api';

export default function Step2SelectClimax({ project, updateProject, projectId, saveProject }) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const trimContainerRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | 'region' | null
  const dragOriginRef = useRef(null); // { time, climaxStart, climaxEnd } for region drag
  const clickStartRef = useRef(null); // { x, y } to distinguish click from drag

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

  // Convert pixel position to time
  const pxToTime = useCallback((px) => {
    const container = trimContainerRef.current;
    if (!container || !duration) return 0;
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (px - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  // Convert time to percentage
  const timeToPct = useCallback((time) => {
    if (!duration) return 0;
    return (time / duration) * 100;
  }, [duration]);

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

  // Drag handlers for trim bars
  const handleMouseDown = useCallback((which) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (which === 'region') {
      const time = pxToTime(e.clientX);
      dragOriginRef.current = { time, climaxStart: project.climaxStart, climaxEnd: project.climaxEnd };
      // Stop playback when dragging the whole region
      if (isPlaying && wavesurferRef.current) {
        wavesurferRef.current.pause();
      }
    }
    setDragging(which);
  }, [pxToTime, project.climaxStart, project.climaxEnd, isPlaying]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const time = pxToTime(e.clientX);
    const rounded = Math.round(time * 10) / 10;

    if (dragging === 'start') {
      const maxStart = project.climaxEnd - 5;
      const clamped = Math.max(0, Math.min(rounded, maxStart));
      updateProject({ climaxStart: clamped });
    } else if (dragging === 'end') {
      const minEnd = project.climaxStart + 5;
      const clamped = Math.max(minEnd, Math.min(rounded, duration));
      updateProject({ climaxEnd: clamped });
    } else if (dragging === 'region' && dragOriginRef.current) {
      const delta = rounded - dragOriginRef.current.time;
      const regionDur = dragOriginRef.current.climaxEnd - dragOriginRef.current.climaxStart;
      let newStart = dragOriginRef.current.climaxStart + delta;
      let newEnd = dragOriginRef.current.climaxEnd + delta;
      // Clamp to boundaries
      if (newStart < 0) { newStart = 0; newEnd = regionDur; }
      if (newEnd > duration) { newEnd = duration; newStart = duration - regionDur; }
      newStart = Math.round(newStart * 10) / 10;
      newEnd = Math.round(newEnd * 10) / 10;
      updateProject({ climaxStart: newStart, climaxEnd: newEnd });
    }
  }, [dragging, pxToTime, project.climaxStart, project.climaxEnd, duration, updateProject]);

  const handleMouseUp = useCallback((e) => {
    if (dragging === 'region' && clickStartRef.current) {
      const dx = Math.abs(e.clientX - clickStartRef.current.x);
      const dy = Math.abs(e.clientY - clickStartRef.current.y);
      if (dx < 4 && dy < 4) {
        // Click (not drag) — seek to clicked position and play
        const time = pxToTime(e.clientX);
        if (wavesurferRef.current && time >= project.climaxStart && time <= project.climaxEnd) {
          wavesurferRef.current.setTime(time);
          setCurrentTime(time);
          if (!isPlaying) {
            wavesurferRef.current.play();
          }
        }
      } else {
        // Actual drag — seek to the new start of the moved region
        if (wavesurferRef.current) {
          wavesurferRef.current.setTime(project.climaxStart);
          setCurrentTime(project.climaxStart);
        }
      }
    }
    clickStartRef.current = null;
    if (dragging) {
      setDragging(null);
    }
  }, [dragging, pxToTime, project.climaxStart, project.climaxEnd, isPlaying]);

  // Attach global mouse listeners while dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = dragging === 'region' ? 'grabbing' : 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch support for mobile
  const handleTouchStart = useCallback((which) => (e) => {
    e.stopPropagation();
    if (which === 'region') {
      const touch = e.touches[0];
      const time = pxToTime(touch.clientX);
      dragOriginRef.current = { time, climaxStart: project.climaxStart, climaxEnd: project.climaxEnd };
    }
    setDragging(which);
  }, [pxToTime, project.climaxStart, project.climaxEnd]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const time = pxToTime(touch.clientX);
    const rounded = Math.round(time * 10) / 10;
    if (dragging === 'start') {
      const clamped = Math.max(0, Math.min(rounded, project.climaxEnd - 5));
      updateProject({ climaxStart: clamped });
    } else if (dragging === 'end') {
      const clamped = Math.max(project.climaxStart + 5, Math.min(rounded, duration));
      updateProject({ climaxEnd: clamped });
    } else if (dragging === 'region' && dragOriginRef.current) {
      const delta = rounded - dragOriginRef.current.time;
      const regionDur = dragOriginRef.current.climaxEnd - dragOriginRef.current.climaxStart;
      let newStart = dragOriginRef.current.climaxStart + delta;
      let newEnd = dragOriginRef.current.climaxEnd + delta;
      if (newStart < 0) { newStart = 0; newEnd = regionDur; }
      if (newEnd > duration) { newEnd = duration; newStart = duration - regionDur; }
      newStart = Math.round(newStart * 10) / 10;
      newEnd = Math.round(newEnd * 10) / 10;
      updateProject({ climaxStart: newStart, climaxEnd: newEnd });
    }
  }, [dragging, pxToTime, project.climaxStart, project.climaxEnd, duration, updateProject]);

  const handleTouchEnd = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragging, handleTouchMove, handleTouchEnd]);

  // Initialize WaveSurfer (no regions plugin needed for visual)
  useEffect(() => {
    let cancelled = false;
    let ws = null;

    const initWaveSurfer = async () => {
      if (!project.audioUrl || !waveformRef.current) return;
      await new Promise(resolve => setTimeout(resolve, 100));
      if (cancelled) return;

      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;
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
          cursorWidth: 2,
          height: 140,
          barWidth: 3,
          barGap: 1,
          barRadius: 3,
          responsive: true,
          normalize: true,
          interact: true,
        });

        ws.on('ready', () => {
          if (cancelled) return;
          const dur = ws.getDuration();
          setDuration(dur);
          setIsReady(true);
          // Ensure climaxEnd doesn't exceed duration
          if (project.climaxEnd > dur) {
            updateProject({ climaxEnd: dur });
          }
        });

        ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));
        ws.on('interaction', () => setCurrentTime(ws.getCurrentTime()));

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
        if (!cancelled) console.error('Failed to initialize WaveSurfer:', err);
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

  const regionDuration = project.climaxEnd - project.climaxStart;

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
      updateProject({ climaxStart: data.start, climaxEnd: data.end });
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
    }
  };

  if (!project.audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Waves className="w-16 h-16 text-[#2a2a35] mb-4" />
        <h3 className="font-heading text-xl font-semibold text-[#f8f8f8] mb-2">No Audio Uploaded</h3>
        <p className="text-[#8b8b99]">Go back to Step 1 and upload an audio file to select the climax.</p>
      </div>
    );
  }

  const startPct = timeToPct(project.climaxStart);
  const endPct = timeToPct(project.climaxEnd);
  const playheadPct = timeToPct(currentTime);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Select Climax</h2>
        <p className="text-[#8b8b99]">Choose the 30-50 second highlight of your song for the video</p>
      </div>

      {/* Waveform + Trim Bars */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <div
          ref={trimContainerRef}
          className="relative w-full select-none"
          style={{ minHeight: 200 }}
          data-testid="waveform-trim-container"
        >
          {/* Waveform canvas */}
          <div
            ref={waveformRef}
            className="w-full bg-[#0c0c0f] rounded-lg"
            style={{ height: 140, pointerEvents: dragging ? 'none' : 'auto' }}
            data-testid="waveform"
          />

          {/* Overlay: dimmed regions outside selection */}
          {isReady && (
            <>
              {/* Left dim */}
              <div
                className="absolute top-0 left-0 rounded-l-lg"
                style={{
                  width: `${startPct}%`,
                  height: 140,
                  background: 'rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
              {/* Right dim */}
              <div
                className="absolute top-0 right-0 rounded-r-lg"
                style={{
                  width: `${100 - endPct}%`,
                  height: 140,
                  background: 'rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
              {/* Selected region highlight (top + bottom border) — draggable + click-to-seek */}
              <div
                onMouseDown={(e) => {
                  clickStartRef.current = { x: e.clientX, y: e.clientY };
                  handleMouseDown('region')(e);
                }}
                onTouchStart={handleTouchStart('region')}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  height: 140,
                  borderTop: '3px solid #e94560',
                  borderBottom: '3px solid #e94560',
                  background: dragging === 'region' ? 'rgba(233,69,96,0.18)' : 'rgba(233,69,96,0.08)',
                  cursor: 'grab',
                  zIndex: 3,
                  touchAction: 'none',
                }}
                data-testid="trim-region"
              />

              {/* ===== LEFT TRIM BAR (Start) ===== */}
              <div
                onMouseDown={handleMouseDown('start')}
                onTouchStart={handleTouchStart('start')}
                className="absolute top-0 group"
                style={{
                  left: `${startPct}%`,
                  height: 140,
                  zIndex: 10,
                  transform: 'translateX(-50%)',
                  cursor: 'ew-resize',
                  touchAction: 'none',
                }}
                data-testid="trim-bar-start"
              >
                {/* Invisible wide grab area */}
                <div style={{ position: 'absolute', top: 0, left: -16, width: 32, height: '100%' }} />
                {/* Visible bar line */}
                <div
                  className="transition-all"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: -2,
                    width: 4,
                    height: '100%',
                    background: dragging === 'start' ? '#f25a74' : '#e94560',
                    borderRadius: 2,
                    boxShadow: dragging === 'start'
                      ? '0 0 16px rgba(233,69,96,0.8)'
                      : '0 0 8px rgba(233,69,96,0.5)',
                  }}
                />
                {/* Handle grip (center circle) */}
                <div
                  className="transition-all"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: dragging === 'start' ? '#f25a74' : '#e94560',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 11,
                  }}
                >
                  <div style={{ width: 2, height: 10, background: '#fff', borderRadius: 1, marginRight: 2 }} />
                  <div style={{ width: 2, height: 10, background: '#fff', borderRadius: 1 }} />
                </div>
                {/* Time label */}
                <div
                  style={{
                    position: 'absolute',
                    top: -32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#e94560',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '3px 8px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    zIndex: 12,
                  }}
                  data-testid="trim-label-start"
                >
                  {formatTime(project.climaxStart)}
                </div>
              </div>

              {/* ===== RIGHT TRIM BAR (End) ===== */}
              <div
                onMouseDown={handleMouseDown('end')}
                onTouchStart={handleTouchStart('end')}
                className="absolute top-0 group"
                style={{
                  left: `${endPct}%`,
                  height: 140,
                  zIndex: 10,
                  transform: 'translateX(-50%)',
                  cursor: 'ew-resize',
                  touchAction: 'none',
                }}
                data-testid="trim-bar-end"
              >
                {/* Invisible wide grab area */}
                <div style={{ position: 'absolute', top: 0, left: -16, width: 32, height: '100%' }} />
                {/* Visible bar line */}
                <div
                  className="transition-all"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: -2,
                    width: 4,
                    height: '100%',
                    background: dragging === 'end' ? '#f25a74' : '#e94560',
                    borderRadius: 2,
                    boxShadow: dragging === 'end'
                      ? '0 0 16px rgba(233,69,96,0.8)'
                      : '0 0 8px rgba(233,69,96,0.5)',
                  }}
                />
                {/* Handle grip (center circle) */}
                <div
                  className="transition-all"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: dragging === 'end' ? '#f25a74' : '#e94560',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 11,
                  }}
                >
                  <div style={{ width: 2, height: 10, background: '#fff', borderRadius: 1, marginRight: 2 }} />
                  <div style={{ width: 2, height: 10, background: '#fff', borderRadius: 1 }} />
                </div>
                {/* Time label */}
                <div
                  style={{
                    position: 'absolute',
                    top: -32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#e94560',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '3px 8px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    zIndex: 12,
                  }}
                  data-testid="trim-label-end"
                >
                  {formatTime(project.climaxEnd)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Info bar below waveform */}
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#e94560] border-2 border-white" />
            <span className="text-xs text-[#8b8b99]">Drag the trim bars to adjust start & end</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#8b8b99]">
              Start: <span className="text-[#e94560] font-mono font-semibold">{formatTime(project.climaxStart)}</span>
            </span>
            <span className="text-[#8b8b99]">
              End: <span className="text-[#e94560] font-mono font-semibold">{formatTime(project.climaxEnd)}</span>
            </span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 mt-5">
          <button
            onClick={handlePlayPause}
            disabled={!isReady}
            className="flex items-center gap-2 px-8 py-3 bg-[#e94560] text-white rounded-full hover:bg-[#f25a74] transition-all disabled:opacity-50 text-base font-medium"
            data-testid="play-pause-button"
          >
            {isPlaying ? (
              <><Pause className="w-5 h-5" /> Pause</>
            ) : (
              <><Play className="w-5 h-5" fill="white" /> Play Selection</>
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
            <><Loader2 className="w-5 h-5 text-[#e94560] animate-spin" /> Analyzing audio...</>
          ) : (
            <><Wand2 className="w-5 h-5 text-[#e94560]" /> Auto-detect Climax</>
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
          <li>Drag the <strong className="text-[#e94560]">left trim bar</strong> to set the start point</li>
          <li>Drag the <strong className="text-[#e94560]">right trim bar</strong> to set the end point</li>
          <li>Drag the <strong className="text-[#e94560]">highlighted region</strong> to move the whole selection without resizing</li>
          <li><strong>Play Selection</strong> plays only the highlighted region</li>
          <li>Type exact times (m:ss) in the fields below the waveform</li>
          <li>Use "Auto-detect" to find the most energetic 40-second section</li>
        </ul>
      </div>
    </div>
  );
}
