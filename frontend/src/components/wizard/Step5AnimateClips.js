import React, { useState, useEffect, useRef } from 'react';
import { Play, Check, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { AuthImage, AuthVideo } from '../AuthImage';

export default function Step5AnimateClips({ project, updateProject, projectId }) {
  const [animatingIndex, setAnimatingIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationStatus, setAnimationStatus] = useState({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  const approvedImages = project.images.filter(img => img.status === 'approved');
  const costPerClip = 0.25; // FAL.AI Wan estimated cost

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAnimate = async (imageId, index) => {
    if (!projectId) {
      setError('Project not created yet');
      return;
    }

    const image = approvedImages.find(img => img.id === imageId);
    if (!image) return;

    setAnimatingIndex(index);
    setError('');
    setElapsedTime(0);
    setAnimationStatus({ ...animationStatus, [imageId]: 'SUBMITTING' });

    // Start elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    try {
      // Submit animation job
      const { data } = await api.post(
        '/ai/animate-image',
        {
          projectId,
          imageIndex: index,
          imagePath: image.imagePath || `${projectId}/images/img_${index}.png`,
          prompt: `${project.concept.mood || project.concept.animationStyle || 'cinematic slow zoom'}, ${project.concept.theme || 'emotional'}`
        }
      );

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit animation');
      }

      setAnimationStatus({ ...animationStatus, [imageId]: 'IN_QUEUE' });

      // Start polling for status
      const requestId = data.requestId;
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(
            `/ai/animation-status/${requestId}?project_id=${projectId}&image_index=${index}`
          );

          const status = statusRes.data.status;
          setAnimationStatus(prev => ({ ...prev, [imageId]: status }));

          if (status === 'COMPLETED') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            pollingRef.current = null;
            timerRef.current = null;

            // Update clips array
            const newClip = {
              id: `clip-${imageId}`,
              imageId,
              clipUrl: statusRes.data.clipUrl,
              clipPath: statusRes.data.clipPath,
              duration: 5.0,
              status: 'pending',
              cost: statusRes.data.cost || costPerClip,
            };

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
              costs: { ...project.costs, clips: totalClipCost }
            });

            setAnimatingIndex(null);
            setElapsedTime(0);

          } else if (status === 'ERROR') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            pollingRef.current = null;
            timerRef.current = null;
            setError(statusRes.data.error || 'Animation failed');
            setAnimatingIndex(null);
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 5000); // Poll every 5 seconds

    } catch (err) {
      console.error('Animation submission failed:', err);
      clearInterval(timerRef.current);
      timerRef.current = null;
      setError(err.response?.data?.detail || 'Failed to start animation. Check your FAL.AI API key in Settings.');
      setAnimatingIndex(null);
      setAnimationStatus({ ...animationStatus, [imageId]: 'ERROR' });
    }
  };

  const handleApproveClip = (clipId) => {
    updateProject({
      clips: project.clips.map(clip =>
        clip.id === clipId ? { ...clip, status: 'approved' } : clip
      )
    });

    // Auto-advance to next unapproved
    const nextUnapproved = approvedImages.findIndex((img, i) => {
      const clip = project.clips.find(c => c.imageId === img.id);
      return !clip || clip.status !== 'approved';
    });
    if (nextUnapproved >= 0 && nextUnapproved !== currentIndex) {
      setCurrentIndex(nextUnapproved);
    } else if (currentIndex < approvedImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleReAnimate = (imageId, index) => {
    // Remove existing clip and re-animate
    updateProject({
      clips: project.clips.filter(c => c.imageId !== imageId)
    });
    setAnimationStatus({ ...animationStatus, [imageId]: null });
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
          Generate video clips from your approved images using FAL.AI
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clips List */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {approvedImages.map((image, index) => {
          const clip = getClipForImage(image.id);
          const isCurrent = index === currentIndex;
          const isAnimating = animatingIndex === index;
          const status = animationStatus[image.id];

          return (
            <div
              key={image.id}
              onClick={() => !isAnimating && setCurrentIndex(index)}
              className={`flex-shrink-0 w-32 cursor-pointer transition-all ${
                isCurrent ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div
                className={`aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all relative ${
                  clip?.status === 'approved'
                    ? 'border-[#10b981]'
                    : isCurrent
                    ? 'border-[#e94560]'
                    : 'border-[#2a2a35]'
                }`}
              >
                {image.url ? (
                  <AuthImage src={image.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: image.color }} />
                )}
                {isAnimating && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#e94560] animate-spin" />
                  </div>
                )}
              </div>
              <div className="text-center mt-2">
                <span className="text-xs text-[#8b8b99]">
                  {clip?.status === 'approved' ? (
                    <span className="text-[#10b981]">{clip.duration}s ✓</span>
                  ) : clip ? (
                    <span className="text-[#f59e0b]">{clip.duration}s</span>
                  ) : status === 'IN_QUEUE' || status === 'IN_PROGRESS' ? (
                    <span className="text-[#f59e0b]">Generating...</span>
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
            {/* Image/Video Preview */}
            <div className="aspect-[9/16] rounded-lg overflow-hidden border border-[#e94560] relative">
              {getClipForImage(approvedImages[currentIndex].id)?.clipUrl ? (
                <AuthVideo
                  src={`${process.env.REACT_APP_BACKEND_URL}${getClipForImage(approvedImages[currentIndex].id).clipUrl}`}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              ) : approvedImages[currentIndex].url ? (
                <AuthImage
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

              {/* Animation Progress Overlay */}
              {animatingIndex === currentIndex && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-[#e94560] animate-spin mb-4" />
                  <p className="text-white font-medium">Generating animation...</p>
                  <p className="text-[#8b8b99] text-sm mt-1">{elapsedTime}s elapsed</p>
                  <p className="text-[#8b8b99] text-xs mt-2">
                    Status: {animationStatus[approvedImages[currentIndex].id] || 'Submitting...'}
                  </p>
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
                      Generating... {elapsedTime}s
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
                  {/* Clip Info */}
                  <div className="bg-[#0c0c0f] p-4 rounded-lg">
                    <p className="text-[#f8f8f8]">
                      Video clip generated: {getClipForImage(approvedImages[currentIndex].id).duration}s
                    </p>
                    <p className="text-sm text-[#8b8b99] mt-1">
                      Watch the preview above, then approve or re-animate
                    </p>
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
        {project.clips.map((clip) => {
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
          Clips: {project.clips.length} × $0.25 =
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
