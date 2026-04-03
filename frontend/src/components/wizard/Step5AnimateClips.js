import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Check, CheckCheck, X, RefreshCw, Loader2, AlertCircle, Zap } from 'lucide-react';
import api from '../../lib/api';
import { AuthImage, AuthVideo } from '../AuthImage';

export default function Step5AnimateClips({ project, updateProject, projectId }) {
  const [animatingIndex, setAnimatingIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationStatus, setAnimationStatus] = useState({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState('');
  const [batchAnimating, setBatchAnimating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const pollingRef = useRef(null);
  const timerRef = useRef(null);
  const batchCancelRef = useRef(false);

  const approvedImages = project.images.filter(img => img.status === 'approved');
  const costPerClip = 0.25;

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      batchCancelRef.current = true;
    };
  }, []);

  // Core animation function that returns a promise
  const animateSingle = useCallback(async (imageId, index) => {
    const image = approvedImages.find(img => img.id === imageId);
    if (!image) throw new Error('Image not found');

    setAnimatingIndex(index);
    setCurrentIndex(index);
    setElapsedTime(0);
    setAnimationStatus(prev => ({ ...prev, [imageId]: 'SUBMITTING' }));

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const { data } = await api.post('/ai/animate-image', {
      projectId,
      imageIndex: index,
      imagePath: image.imagePath || `${projectId}/images/img_${index}.png`,
      prompt: `${project.concept.mood || project.concept.animationStyle || 'cinematic slow zoom'}, ${project.concept.theme || 'emotional'}`
    });

    if (!data.success) throw new Error(data.error || 'Failed to submit animation');

    setAnimationStatus(prev => ({ ...prev, [imageId]: 'IN_QUEUE' }));

    // Poll until done
    return new Promise((resolve, reject) => {
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

            const newClip = {
              id: `clip-${imageId}`,
              imageId,
              clipUrl: statusRes.data.clipUrl,
              clipPath: statusRes.data.clipPath,
              duration: 5.0,
              status: 'pending',
              cost: statusRes.data.cost || costPerClip,
            };

            updateProject(prev => {
              const existingIdx = prev.clips.findIndex(c => c.imageId === imageId);
              let newClips;
              if (existingIdx >= 0) {
                newClips = [...prev.clips];
                newClips[existingIdx] = newClip;
              } else {
                newClips = [...prev.clips, newClip];
              }
              const totalClipCost = newClips.reduce((sum, c) => sum + (c.cost || 0), 0);
              return { clips: newClips, costs: { ...prev.costs, clips: totalClipCost } };
            });

            setAnimatingIndex(null);
            setElapsedTime(0);
            resolve(newClip);
          } else if (status === 'ERROR') {
            clearInterval(pollingRef.current);
            clearInterval(timerRef.current);
            pollingRef.current = null;
            timerRef.current = null;
            setAnimatingIndex(null);
            reject(new Error(statusRes.data.error || 'Animation failed'));
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 5000);
    });
  }, [approvedImages, projectId, project.concept, updateProject, costPerClip]);

  const handleAnimate = async (imageId, index) => {
    if (!projectId) { setError('Project not created yet'); return; }
    setError('');
    try {
      await animateSingle(imageId, index);
    } catch (err) {
      console.error('Animation failed:', err);
      const imageObj = approvedImages.find(img => img.id === imageId);
      if (imageObj) setAnimationStatus(prev => ({ ...prev, [imageId]: 'ERROR' }));
      setError(err.response?.data?.detail || err.message || 'Failed to start animation. Check your FAL.AI API key in Settings.');
      setAnimatingIndex(null);
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleAnimateAll = async () => {
    if (!projectId) { setError('Project not created yet'); return; }
    setError('');
    batchCancelRef.current = false;
    setBatchAnimating(true);

    // Find images that don't have clips yet
    const toAnimate = approvedImages.filter(img => {
      const clip = project.clips.find(c => c.imageId === img.id);
      return !clip;
    });

    if (toAnimate.length === 0) {
      setError('All images already have animation clips.');
      setBatchAnimating(false);
      return;
    }

    setBatchProgress({ current: 0, total: toAnimate.length });

    for (let i = 0; i < toAnimate.length; i++) {
      if (batchCancelRef.current) break;

      const img = toAnimate[i];
      const imgIndex = approvedImages.indexOf(img);
      setBatchProgress({ current: i + 1, total: toAnimate.length });

      try {
        await animateSingle(img.id, imgIndex);
      } catch (err) {
        console.error(`Animation ${i + 1}/${toAnimate.length} failed:`, err);
        setAnimationStatus(prev => ({ ...prev, [img.id]: 'ERROR' }));
        setError(`Animation failed for image ${imgIndex + 1}: ${err.message || 'Unknown error'}. Continuing with remaining images...`);
        setAnimatingIndex(null);
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    setBatchAnimating(false);
    setBatchProgress({ current: 0, total: 0 });
  };

  const handleApproveClip = (clipId) => {
    updateProject({
      clips: project.clips.map(clip =>
        clip.id === clipId ? { ...clip, status: 'approved' } : clip
      )
    });
    // Auto-advance
    const nextUnapproved = approvedImages.findIndex((img) => {
      const clip = project.clips.find(c => c.imageId === img.id);
      return clip && clip.status !== 'approved';
    });
    if (nextUnapproved >= 0 && nextUnapproved !== currentIndex) {
      setCurrentIndex(nextUnapproved);
    } else if (currentIndex < approvedImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleApproveAll = () => {
    const pendingClips = project.clips.filter(c => c.status === 'pending');
    if (pendingClips.length === 0) return;
    updateProject({
      clips: project.clips.map(clip =>
        clip.status === 'pending' ? { ...clip, status: 'approved' } : clip
      )
    });
  };

  const handleRejectAll = () => {
    const pendingClips = project.clips.filter(c => c.status === 'pending');
    if (pendingClips.length === 0) return;
    updateProject({
      clips: project.clips.map(clip =>
        clip.status === 'pending' ? { ...clip, status: 'rejected' } : clip
      )
    });
  };

  const handleReAnimate = (imageId, index) => {
    updateProject({
      clips: project.clips.filter(c => c.imageId !== imageId)
    });
    setAnimationStatus(prev => ({ ...prev, [imageId]: null }));
    handleAnimate(imageId, index);
  };

  const getClipForImage = (imageId) => project.clips.find(c => c.imageId === imageId);

  const approvedClips = project.clips.filter(c => c.status === 'approved');
  const pendingClips = project.clips.filter(c => c.status === 'pending');
  const unanimated = approvedImages.filter(img => !getClipForImage(img.id));
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

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Batch Actions Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {unanimated.length > 0 && (
          <button
            onClick={handleAnimateAll}
            disabled={animatingIndex !== null || batchAnimating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50 text-sm font-medium"
            data-testid="animate-all-button"
          >
            {batchAnimating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Animating {batchProgress.current}/{batchProgress.total}...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Animate All ({unanimated.length})
              </>
            )}
          </button>
        )}
        {pendingClips.length > 0 && (
          <>
            <button
              onClick={handleApproveAll}
              disabled={batchAnimating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all disabled:opacity-50 text-sm font-medium"
              data-testid="approve-all-clips"
            >
              <CheckCheck className="w-4 h-4" />
              Approve All ({pendingClips.length})
            </button>
            <button
              onClick={handleRejectAll}
              disabled={batchAnimating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-all disabled:opacity-50 text-sm font-medium"
              data-testid="reject-all-clips"
            >
              Reject All ({pendingClips.length})
            </button>
          </>
        )}
        {batchAnimating && (
          <button
            onClick={() => { batchCancelRef.current = true; }}
            className="flex items-center gap-2 px-4 py-2.5 text-[#ef4444] border border-[#ef4444]/30 rounded-lg hover:bg-[#ef4444]/10 transition-all text-sm"
          >
            Stop
          </button>
        )}
      </div>

      {/* Thumbnails Strip */}
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
              data-testid={`clip-thumb-${index}`}
            >
              <div className={`aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all relative ${
                clip?.status === 'approved' ? 'border-[#10b981]'
                  : isCurrent ? 'border-[#e94560]'
                  : 'border-[#2a2a35]'
              }`}>
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
                {clip?.status === 'approved' && (
                  <div className="absolute top-1 right-1 bg-[#10b981] p-0.5 rounded-full">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="text-center mt-2">
                <span className="text-xs text-[#8b8b99]">
                  {clip?.status === 'approved' ? (
                    <span className="text-[#10b981]">{clip.duration}s</span>
                  ) : clip ? (
                    <span className="text-[#f59e0b]">{clip.duration}s (pending)</span>
                  ) : status === 'IN_QUEUE' || status === 'IN_PROGRESS' ? (
                    <span className="text-[#f59e0b]">Generating...</span>
                  ) : status === 'ERROR' ? (
                    <span className="text-[#ef4444]">Failed</span>
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
            <div className="aspect-[9/16] rounded-lg overflow-hidden border border-[#e94560] relative">
              {getClipForImage(approvedImages[currentIndex].id)?.clipUrl ? (
                <AuthVideo
                  src={`${process.env.REACT_APP_BACKEND_URL}${getClipForImage(approvedImages[currentIndex].id).clipUrl}`}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              ) : approvedImages[currentIndex].url ? (
                <AuthImage src={approvedImages[currentIndex].url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: approvedImages[currentIndex].color }}>
                  <span className="text-white/50 text-lg">Image {currentIndex + 1}</span>
                </div>
              )}
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

            <div className="flex flex-col justify-center space-y-6">
              <h3 className="font-heading text-lg font-semibold text-[#f8f8f8]">
                Image {currentIndex + 1} of {approvedImages.length}
              </h3>

              {!getClipForImage(approvedImages[currentIndex].id) ? (
                <button
                  onClick={() => handleAnimate(approvedImages[currentIndex].id, currentIndex)}
                  disabled={animatingIndex !== null || batchAnimating}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
                  data-testid={`animate-${currentIndex}`}
                >
                  {animatingIndex === currentIndex ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Generating... {elapsedTime}s</>
                  ) : (
                    <><Play className="w-5 h-5" /> Animate</>
                  )}
                </button>
              ) : (
                <>
                  <div className="bg-[#0c0c0f] p-4 rounded-lg">
                    <p className="text-[#f8f8f8]">
                      Video clip generated: {getClipForImage(approvedImages[currentIndex].id).duration}s
                    </p>
                    <p className="text-sm text-[#8b8b99] mt-1">Watch the preview, then approve or re-animate</p>
                  </div>

                  {getClipForImage(approvedImages[currentIndex].id).status !== 'approved' ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveClip(getClipForImage(approvedImages[currentIndex].id).id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all"
                        data-testid={`approve-clip-${currentIndex}`}
                      >
                        <Check className="w-5 h-5" /> Approve
                      </button>
                      <button
                        onClick={() => handleReAnimate(approvedImages[currentIndex].id, currentIndex)}
                        disabled={animatingIndex !== null || batchAnimating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#f59e0b] text-white rounded-lg hover:bg-[#d97706] transition-all disabled:opacity-50"
                        data-testid={`reanimate-${currentIndex}`}
                      >
                        <RefreshCw className="w-5 h-5" /> Re-animate
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
          const imgIndex = img ? approvedImages.indexOf(img) : -1;
          return (
            <span key={clip.id} className="text-[#8b8b99]">
              Clip {imgIndex + 1}: {clip.duration}s
              {clip.status === 'approved' ? (
                <span className="text-[#10b981] ml-1">&#10003;</span>
              ) : (
                <span className="text-[#f59e0b] ml-1">(pending)</span>
              )}
            </span>
          );
        })}
        {project.clips.length > 0 && (
          <span className="text-[#f8f8f8] font-medium">| Total: {totalDuration.toFixed(1)}s</span>
        )}
      </div>

      {project.clips.length > 0 && (
        <div className="text-center text-sm text-[#8b8b99]">
          Clips: {project.clips.length} x $0.25 = <span className="text-[#e94560] ml-1">${totalCost.toFixed(2)}</span>
        </div>
      )}

      {approvedClips.length < 2 && (
        <div className="text-center text-[#f59e0b] text-sm">Approve at least 2 clips to continue</div>
      )}
    </div>
  );
}
