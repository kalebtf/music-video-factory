import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Play, RefreshCw, Loader2, Film, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import api from '../../lib/api';
import { AuthImage, AuthVideo } from '../AuthImage';

const POLL_INTERVAL = 3000;

export default function Step6AssembleVideo({ project, updateProject, projectId }) {
  const [assembling, setAssembling] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [error, setError] = useState('');
  const [subtitleInfo, setSubtitleInfo] = useState(null);
  const pollRef = useRef(null);

  const approvedClips = project.clips.filter(c => c.status === 'approved');
  const approvedImages = project.images.filter(i => i.status === 'approved');

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJobStatus = (jid) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/video/assemble/${jid}/status`);

        setStatusMessage(data.message || 'Processing...');

        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setAssembling(false);
          setJobId(null);

          updateProject({
            assembledVideo: {
              url: data.videoUrl,
              duration: data.duration,
              fileSize: data.fileSize,
            }
          });

          if (data.subtitlesCapped) {
            setSubtitleInfo({
              original: data.originalSubtitleCount,
              used: data.usedSubtitleCount,
            });
          }
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setAssembling(false);
          setJobId(null);
          setError(data.error || 'Video assembly failed. Please try again.');
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient errors — only stop after many failures
      }
    }, POLL_INTERVAL);
  };

  const handleAssemble = async () => {
    if (!projectId) { setError('Project not created yet'); return; }
    if (approvedClips.length < 2) { setError('Need at least 2 approved clips to assemble'); return; }

    setAssembling(true);
    setError('');
    setSubtitleInfo(null);
    setStatusMessage('Starting assembly...');

    try {
      const clipOrder = approvedClips.map((clip) => {
        const imgIndex = approvedImages.findIndex(img => img.id === clip.imageId);
        return imgIndex >= 0 ? imgIndex : 0;
      });

      const { data } = await api.post('/video/assemble', {
        projectId,
        clipOrder,
        crossfadeDuration: project.assemblySettings.crossfade,
        addTextOverlay: project.assemblySettings.addTextOverlay,
        hookText: project.concept.selectedHooks?.[0] || '',
        hookTexts: project.concept.selectedHooks || [],
        addSubtitles: project.assemblySettings.addSubtitles || false,
        lyrics: project.lyrics || ''
      });

      if (data.jobId) {
        setJobId(data.jobId);
        setStatusMessage(data.message || 'Assembly started...');
        pollJobStatus(data.jobId);
      } else if (data.success) {
        // Fallback: direct response (shouldn't happen with new backend)
        setAssembling(false);
        updateProject({
          assembledVideo: {
            url: data.videoUrl,
            duration: data.duration,
            fileSize: data.fileSize,
          }
        });
      }
    } catch (err) {
      console.error('Assembly failed:', err);
      setError(err.response?.data?.detail || 'Video assembly failed. Please try again.');
      setAssembling(false);
    }
  };

  const handleDragStart = (index) => setDraggedIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newClips = [...project.clips];
    const draggedClip = newClips[draggedIndex];
    newClips.splice(draggedIndex, 1);
    newClips.splice(index, 0, draggedClip);
    updateProject({ clips: newClips });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const updateSettings = (key, value) => {
    updateProject({
      assemblySettings: { ...project.assemblySettings, [key]: value }
    });
  };

  const handleReAssemble = () => {
    updateProject({ assembledVideo: null });
    setSubtitleInfo(null);
    handleAssemble();
  };

  const totalDuration = approvedClips.reduce((sum, c) => sum + c.duration, 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Assemble Video</h2>
        <p className="text-[#8b8b99]">Arrange your clips and configure the final video</p>
      </div>

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2" data-testid="assembly-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {subtitleInfo && (
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] px-4 py-3 rounded-lg flex items-center gap-2" data-testid="subtitle-cap-notice">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>
            Subtitles reduced from {subtitleInfo.original} to {subtitleInfo.used} lines for rendering stability.
            The most representative lines were kept evenly spaced.
          </span>
        </div>
      )}

      {/* Clips Arrangement */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Clip Order (drag to reorder)</h3>
        <div className="space-y-2">
          {approvedClips.map((clip, index) => {
            const image = approvedImages.find(i => i.id === clip.imageId);
            return (
              <div
                key={clip.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 bg-[#0c0c0f] p-3 rounded-lg border transition-all cursor-move ${
                  draggedIndex === index ? 'border-[#e94560] opacity-50' : 'border-[#2a2a35]'
                }`}
                data-testid={`clip-item-${index}`}
              >
                <GripVertical className="w-5 h-5 text-[#8b8b99]" />
                <div className="w-12 h-20 rounded overflow-hidden flex-shrink-0">
                  {clip.clipUrl ? (
                    <AuthVideo
                      src={`${process.env.REACT_APP_BACKEND_URL}${clip.clipUrl}`}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : image?.url ? (
                    <AuthImage src={image.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: image?.color || '#2a2a35' }} />
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-[#f8f8f8] font-medium">Clip {index + 1}</span>
                  <span className="text-[#8b8b99] text-sm ml-2">{clip.duration}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6 space-y-6">
        <h3 className="font-heading font-semibold text-[#f8f8f8]">Settings</h3>

        {/* Text Overlay Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#f8f8f8]">Add text overlay (hooks)</span>
            {project.assemblySettings.addTextOverlay && project.concept.selectedHooks?.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {project.concept.selectedHooks.map((hook, i) => (
                  <p key={i} className="text-xs text-[#8b8b99]">"{hook}"</p>
                ))}
                <p className="text-[10px] text-[#e94560]">
                  {project.concept.selectedHooks.length} hook(s) will cycle throughout the video
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => updateSettings('addTextOverlay', !project.assemblySettings.addTextOverlay)}
            className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${
              project.assemblySettings.addTextOverlay ? 'bg-[#e94560]' : 'bg-[#2a2a35]'
            }`}
            data-testid="toggle-text-overlay"
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all ${
              project.assemblySettings.addTextOverlay ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Crossfade Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#f8f8f8]">Crossfade duration</span>
            <span className="text-[#e94560] font-mono">{project.assemblySettings.crossfade}s</span>
          </div>
          <input
            type="range" min="0.3" max="1.0" step="0.1"
            value={project.assemblySettings.crossfade}
            onChange={(e) => updateSettings('crossfade', parseFloat(e.target.value))}
            className="w-full accent-[#e94560]"
            data-testid="crossfade-slider"
          />
          <div className="flex justify-between text-xs text-[#8b8b99] mt-1">
            <span>0.3s</span><span>1.0s</span>
          </div>
        </div>

        {/* Subtitles Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#f8f8f8]">Add subtitles from lyrics</span>
            {project.assemblySettings.addSubtitles && (
              <div className="mt-1">
                {project.lyrics ? (
                  <p className="text-xs text-[#8b8b99]">
                    {project.lyrics.split('\n').filter(l => l.trim() && !(l.trim().startsWith('[') && l.trim().endsWith(']'))).length} lines
                    {project.lyrics.split('\n').filter(l => l.trim() && !(l.trim().startsWith('[') && l.trim().endsWith(']'))).length > 15 && (
                      <span className="text-[#f59e0b] ml-1">(will be reduced to 15 for stability)</span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-[#f59e0b]">No lyrics found — add lyrics in Step 1</p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => updateSettings('addSubtitles', !project.assemblySettings.addSubtitles)}
            className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${
              project.assemblySettings.addSubtitles ? 'bg-[#e94560]' : 'bg-[#2a2a35]'
            }`}
            data-testid="toggle-subtitles"
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all ${
              project.assemblySettings.addSubtitles ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Assemble Button / Progress / Preview */}
      {assembling ? (
        <div className="bg-[#141418] border border-[#e94560]/30 rounded-xl p-8" data-testid="assembly-progress">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#e94560] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[#f8f8f8] font-medium text-lg">Assembling your video...</p>
              <p className="text-[#8b8b99] text-sm mt-1">{statusMessage}</p>
            </div>
            <div className="w-full max-w-xs bg-[#0c0c0f] rounded-full h-2 overflow-hidden">
              <div className="bg-[#e94560] h-full rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-[#8b8b99]">This may take 1-3 minutes. Please don't close this page.</p>
          </div>
        </div>
      ) : !project.assembledVideo ? (
        <div className="flex justify-center">
          <button
            onClick={handleAssemble}
            disabled={approvedClips.length < 2}
            className="flex items-center gap-2 px-8 py-4 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
            data-testid="assemble-button"
          >
            <Film className="w-5 h-5" />
            Assemble Video
          </button>
        </div>
      ) : (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
            <span className="text-[#10b981] font-medium">Video assembled successfully</span>
          </div>
          <div className="aspect-video bg-[#0c0c0f] rounded-lg overflow-hidden mb-4">
            <AuthVideo
              src={`${process.env.REACT_APP_BACKEND_URL}${project.assembledVideo.url}`}
              className="w-full h-full"
              controls
              playsInline
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8b8b99]">
              Duration: {project.assembledVideo.duration}s | Size: ~{project.assembledVideo.fileSize}MB
            </span>
            <button
              onClick={handleReAssemble}
              className="flex items-center gap-1 text-[#f59e0b] hover:text-[#d97706]"
              data-testid="re-assemble-button"
            >
              <RefreshCw className="w-4 h-4" />
              Re-assemble
            </button>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-[#8b8b99]">
        Total clip duration: <span className="text-[#f8f8f8]">{totalDuration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
