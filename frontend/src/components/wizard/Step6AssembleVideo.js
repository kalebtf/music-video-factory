import React, { useState } from 'react';
import { GripVertical, Play, RefreshCw, Loader2, Film, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

export default function Step6AssembleVideo({ project, updateProject, projectId }) {
  const [assembling, setAssembling] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [error, setError] = useState('');

  const approvedClips = project.clips.filter(c => c.status === 'approved');
  const approvedImages = project.images.filter(i => i.status === 'approved');

  const handleAssemble = async () => {
    if (!projectId) {
      setError('Project not created yet');
      return;
    }

    if (approvedClips.length < 2) {
      setError('Need at least 2 approved clips to assemble');
      return;
    }

    setAssembling(true);
    setError('');

    try {
      // Get clip order based on current clips array
      const clipOrder = approvedClips.map((clip) => {
        const imgIndex = approvedImages.findIndex(img => img.id === clip.imageId);
        return imgIndex >= 0 ? imgIndex : 0;
      });

      const { data } = await api.post(
        '/video/assemble',
        {
          projectId,
          clipOrder,
          crossfadeDuration: project.assemblySettings.crossfade,
          addTextOverlay: project.assemblySettings.addTextOverlay,
          hookText: project.concept.selectedHooks?.[0] || ''
        }
      );

      if (data.success) {
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
    } finally {
      setAssembling(false);
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

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

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const updateSettings = (key, value) => {
    updateProject({
      assemblySettings: {
        ...project.assemblySettings,
        [key]: value,
      }
    });
  };

  const handleReAssemble = () => {
    updateProject({ assembledVideo: null });
    handleAssemble();
  };

  const totalDuration = approvedClips.reduce((sum, c) => sum + c.duration, 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Assemble Video
        </h2>
        <p className="text-[#8b8b99]">
          Arrange your clips and configure the final video
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
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
                    <video
                      src={`${process.env.REACT_APP_BACKEND_URL}${clip.clipUrl}`}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : image?.url ? (
                    <img src={image.url} alt="" className="w-full h-full object-cover" />
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
            <span className="text-[#f8f8f8]">Add text overlay</span>
            {project.assemblySettings.addTextOverlay && project.concept.selectedHooks?.length > 0 && (
              <p className="text-sm text-[#8b8b99] mt-1">
                "{project.concept.selectedHooks[0]}"
              </p>
            )}
          </div>
          <button
            onClick={() => updateSettings('addTextOverlay', !project.assemblySettings.addTextOverlay)}
            className={`w-12 h-6 rounded-full transition-all ${
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
            type="range"
            min="0.3"
            max="1.0"
            step="0.1"
            value={project.assemblySettings.crossfade}
            onChange={(e) => updateSettings('crossfade', parseFloat(e.target.value))}
            className="w-full accent-[#e94560]"
            data-testid="crossfade-slider"
          />
          <div className="flex justify-between text-xs text-[#8b8b99] mt-1">
            <span>0.3s</span>
            <span>1.0s</span>
          </div>
        </div>

        {/* Subtitles Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[#f8f8f8]">Add subtitles from lyrics</span>
          <button
            onClick={() => updateSettings('addSubtitles', !project.assemblySettings.addSubtitles)}
            className={`w-12 h-6 rounded-full transition-all ${
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

      {/* Assemble Button / Preview */}
      {!project.assembledVideo ? (
        <div className="flex justify-center">
          <button
            onClick={handleAssemble}
            disabled={assembling || approvedClips.length < 2}
            className="flex items-center gap-2 px-8 py-4 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
            data-testid="assemble-button"
          >
            {assembling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Assembling video...
              </>
            ) : (
              <>
                <Film className="w-5 h-5" />
                Assemble Video
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
          {/* Real Video Preview */}
          <div className="aspect-video bg-[#0c0c0f] rounded-lg overflow-hidden mb-4">
            <video
              src={`${process.env.REACT_APP_BACKEND_URL}${project.assembledVideo.url}`}
              className="w-full h-full"
              controls
              playsInline
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8b8b99]">
              Duration: {project.assembledVideo.duration}s |
              Size: ~{project.assembledVideo.fileSize}MB
            </span>
            <button
              onClick={handleReAssemble}
              disabled={assembling}
              className="flex items-center gap-1 text-[#f59e0b] hover:text-[#d97706] disabled:opacity-50"
              data-testid="re-assemble-button"
            >
              {assembling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Re-assemble
            </button>
          </div>
        </div>
      )}

      {/* Total Duration */}
      <div className="text-center text-sm text-[#8b8b99]">
        Total clip duration: <span className="text-[#f8f8f8]">{totalDuration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
