import React, { useState } from 'react';
import { Play, Check, RefreshCw, Loader2 } from 'lucide-react';

export default function Step5AnimateClips({ project, updateProject }) {
  const [animatingIndex, setAnimatingIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const approvedImages = project.images.filter(img => img.status === 'approved');
  const costPerSecond = 0.05; // FAL.AI Wan default

  const handleAnimate = async (imageId, index) => {
    setAnimatingIndex(index);
    // Placeholder: simulate video generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    const duration = 5.0; // Default clip duration
    const newClip = {
      id: `clip-${imageId}`,
      imageId,
      duration,
      status: 'pending',
      cost: duration * costPerSecond,
    };

    // Check if clip already exists
    const existingIndex = project.clips.findIndex(c => c.imageId === imageId);
    let newClips;
    if (existingIndex >= 0) {
      newClips = [...project.clips];
      newClips[existingIndex] = newClip;
    } else {
      newClips = [...project.clips, newClip];
    }

    const totalClipCost = newClips.reduce((sum, c) => sum + (c.cost || 0), 0);

    updateProject({
      clips: newClips,
      costs: {
        ...project.costs,
        clips: totalClipCost,
      }
    });
    setAnimatingIndex(null);
  };

  const handleApproveClip = (clipId) => {
    const clipIndex = project.clips.findIndex(c => c.id === clipId);
    updateProject({
      clips: project.clips.map(clip =>
        clip.id === clipId ? { ...clip, status: 'approved' } : clip
      )
    });
    
    // Auto-advance to next
    if (currentIndex < approvedImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleReAnimate = (imageId, index) => {
    // Remove existing clip and re-animate
    updateProject({
      clips: project.clips.filter(c => c.imageId !== imageId)
    });
    handleAnimate(imageId, index);
  };

  const getClipForImage = (imageId) => {
    return project.clips.find(c => c.imageId === imageId);
  };

  const approvedClips = project.clips.filter(c => c.status === 'approved');
  const totalDuration = project.clips.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalCost = project.clips.reduce((sum, c) => sum + (c.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Animate Clips
        </h2>
        <p className="text-[#8b8b99]">
          Generate video clips from your approved images
        </p>
      </div>

      {/* Clips List */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {approvedImages.map((image, index) => {
          const clip = getClipForImage(image.id);
          const isCurrent = index === currentIndex;
          const isAnimating = animatingIndex === index;

          return (
            <div
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-32 cursor-pointer transition-all ${
                isCurrent ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div
                className={`aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all ${
                  clip?.status === 'approved'
                    ? 'border-[#10b981]'
                    : isCurrent
                    ? 'border-[#e94560]'
                    : 'border-[#2a2a35]'
                }`}
              >
                {image.url ? (
                  <img src={image.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: image.color }}
                  />
                )}
              </div>
              <div className="text-center mt-2">
                <span className="text-xs text-[#8b8b99]">
                  {clip?.status === 'approved' ? (
                    <span className="text-[#10b981]">{clip.duration}s ✓</span>
                  ) : clip ? (
                    <span className="text-[#f59e0b]">{clip.duration}s</span>
                  ) : (
                    'Not animated'
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Image Preview */}
      {approvedImages[currentIndex] && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="aspect-[9/16] rounded-lg overflow-hidden border border-[#e94560]">
              {approvedImages[currentIndex].url ? (
                <img
                  src={approvedImages[currentIndex].url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: approvedImages[currentIndex].color }}
                >
                  <span className="text-white/50 text-lg">Image {currentIndex + 1}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col justify-center space-y-6">
              <h3 className="font-heading text-lg font-semibold text-[#f8f8f8]">
                Image {currentIndex + 1} of {approvedImages.length}
              </h3>

              {!getClipForImage(approvedImages[currentIndex].id) ? (
                <button
                  onClick={() => handleAnimate(approvedImages[currentIndex].id, currentIndex)}
                  disabled={animatingIndex !== null}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
                  data-testid={`animate-${currentIndex}`}
                >
                  {animatingIndex === currentIndex ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating clip... ~60s
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Animate
                    </>
                  )}
                </button>
              ) : (
                <>
                  {/* Clip Preview Placeholder */}
                  <div className="aspect-video bg-[#0c0c0f] rounded-lg flex items-center justify-center border border-[#2a2a35]">
                    <div className="text-center">
                      <Play className="w-12 h-12 text-[#e94560] mx-auto mb-2" />
                      <span className="text-[#8b8b99]">
                        {getClipForImage(approvedImages[currentIndex].id).duration}s clip
                      </span>
                    </div>
                  </div>

                  {/* Approve/Re-animate */}
                  {getClipForImage(approvedImages[currentIndex].id).status !== 'approved' ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveClip(getClipForImage(approvedImages[currentIndex].id).id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all"
                        data-testid={`approve-clip-${currentIndex}`}
                      >
                        <Check className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReAnimate(approvedImages[currentIndex].id, currentIndex)}
                        disabled={animatingIndex !== null}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#f59e0b] text-white rounded-lg hover:bg-[#d97706] transition-all disabled:opacity-50"
                        data-testid={`reanimate-${currentIndex}`}
                      >
                        <RefreshCw className="w-5 h-5" />
                        Re-animate
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-[#10b981]">
                      <Check className="w-6 h-6 mx-auto mb-2" />
                      Clip approved!
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Stats */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        {project.clips.map((clip, index) => {
          const img = approvedImages.find(i => i.id === clip.imageId);
          const imgIndex = approvedImages.indexOf(img);
          return (
            <span key={clip.id} className="text-[#8b8b99]">
              Clip {imgIndex + 1}: {clip.duration}s 
              {clip.status === 'approved' ? (
                <span className="text-[#10b981] ml-1">✓</span>
              ) : (
                <span className="text-[#f59e0b] ml-1">(pending)</span>
              )}
            </span>
          );
        })}
        {project.clips.length > 0 && (
          <span className="text-[#f8f8f8] font-medium">
            | Total: {totalDuration.toFixed(1)}s
          </span>
        )}
      </div>

      {/* Cost Display */}
      {project.clips.length > 0 && (
        <div className="text-center text-sm text-[#8b8b99]">
          Clips: {totalDuration.toFixed(1)}s × $0.05 = 
          <span className="text-[#e94560] ml-1">${totalCost.toFixed(2)}</span>
        </div>
      )}

      {/* Requirement Message */}
      {approvedClips.length < 2 && (
        <div className="text-center text-[#f59e0b] text-sm">
          Approve at least 2 clips to continue
        </div>
      )}
    </div>
  );
}
