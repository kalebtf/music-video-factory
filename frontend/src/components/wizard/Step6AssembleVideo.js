import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Play, RefreshCw, Loader2, Film, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import api from '../../lib/api';
import { AuthImage, AuthVideo } from '../AuthImage';

const POLL_INTERVAL = 3000;

export default function Step6AssembleVideo({ project, updateProject, projectId }) {
  const [assembling, setAssembling] = useState(false);
  const [preparingMedia, setPreparingMedia] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState('');
  const [jobId, setJobId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [error, setError] = useState('');
  const [subtitleInfo, setSubtitleInfo] = useState(null);
  const pollRef = useRef(null);

  const isLibrary = project.mode === 'library';

  // AI mode: uses project.clips / project.images
  const approvedClips = project.clips.filter(c => c.status === 'approved');
  const approvedImages = project.images.filter(i => i.status === 'approved');

  // Library mode: uses project.media
  const approvedMedia = (project.media || []).filter(m => m.status === 'approved');

  const items = isLibrary ? approvedMedia : approvedClips;
  const minItems = isLibrary ? 1 : 2;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJobStatus = (jid) => {
    let authRetries = 0;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/video/assemble/${jid}/status`);
        authRetries = 0; // reset on success
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
        // On 401, the axios interceptor will attempt token refresh.
        // If refresh succeeds, the retried request resolves normally above.
        // If refresh fails (no valid refresh token), we silently wait and retry
        // since the backend job continues independently.
        const status = err.response?.status;
        if (status === 401) {
          authRetries++;
          if (authRetries > 10) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setAssembling(false);
            setError('Session expired. Please refresh the page and check your video on the dashboard.');
          }
          // Otherwise silently skip this poll cycle — interceptor handles refresh
        } else {
          console.error('Polling error:', err);
        }
      }
    }, POLL_INTERVAL);
  };

  // Prepare library media items into clips before assembly (FFmpeg effects only — no AI)
  const prepareLibraryClips = async () => {
    const preparedClipPaths = [];
    const climaxDuration = (project.climaxEnd || 30) - (project.climaxStart || 0);

    // Separate images and videos
    const imageItems = [];
    const videoItems = [];
    approvedMedia.forEach((item, idx) => {
      const isImage = item.type === 'stock-photo' || item.type === 'upload-image';
      if (isImage) imageItems.push({ item, idx });
      else videoItems.push({ item, idx });
    });

    // For mixed or image-only: process images normally with their set duration
    // For video items: calculate per-video duration to match audio exactly
    let perVideoDuration = 0;
    let videoRepeatPlan = []; // { item, idx, duration }

    if (videoItems.length > 0) {
      // Calculate total video content duration
      const totalVideoDuration = videoItems.reduce((sum, v) => sum + (v.item.duration || 10), 0);
      // Audio duration we need to fill (minus time used by images)
      const totalImageDuration = imageItems.reduce((sum, img) => sum + (img.item.stillDuration || 4), 0);
      const audioDurForVideos = climaxDuration - totalImageDuration;

      if (audioDurForVideos > 0) {
        if (totalVideoDuration >= audioDurForVideos) {
          // Case 2: Videos longer than audio → trim proportionally
          const ratio = audioDurForVideos / totalVideoDuration;
          videoItems.forEach(v => {
            const trimmed = Math.max(2, Math.round((v.item.duration || 10) * ratio * 10) / 10);
            videoRepeatPlan.push({ ...v, duration: trimmed });
          });
        } else {
          // Case 1: Videos shorter than audio → repeat to fill
          let filled = 0;
          let repeatIdx = 0;
          while (filled < audioDurForVideos) {
            const v = videoItems[repeatIdx % videoItems.length];
            const remaining = audioDurForVideos - filled;
            const dur = Math.min(v.item.duration || 10, remaining);
            if (dur < 1) break; // avoid tiny clips
            videoRepeatPlan.push({ ...v, duration: Math.round(dur * 10) / 10 });
            filled += dur;
            repeatIdx++;
            if (repeatIdx > videoItems.length * 10) break; // safety limit
          }
        }
      }
    }

    // Process items in original order, then append video repeats
    let itemIndex = 0;
    for (let i = 0; i < approvedMedia.length; i++) {
      const item = approvedMedia[i];
      const isImage = item.type === 'stock-photo' || item.type === 'upload-image';
      setPrepareStatus(`Processing item ${i + 1} of ${approvedMedia.length}...`);

      if (isImage) {
        try {
          const { data } = await api.post(`/projects/${projectId}/media/still-to-clip`, {
            imagePath: item.localPath,
            duration: item.stillDuration || 4,
            effect: item.effect || 'ken_burns_in',
          });
          preparedClipPaths.push(data.clipPath);
        } catch (err) {
          console.error(`Still-to-clip failed for item ${i}:`, err);
        }
      }
      // Videos handled via videoRepeatPlan below
    }

    // Process video clips from the repeat plan
    for (let vi = 0; vi < videoRepeatPlan.length; vi++) {
      const vp = videoRepeatPlan[vi];
      setPrepareStatus(`Processing video ${vi + 1} of ${videoRepeatPlan.length}...`);
      try {
        const { data } = await api.post(`/projects/${projectId}/media/trim-video`, {
          videoPath: vp.item.localPath,
          maxDuration: vp.duration,
        });
        preparedClipPaths.push(data.clipPath);
      } catch (err) {
        console.error('Video trim failed:', err);
      }
    }

    return preparedClipPaths;
  };

  const handleAssemble = async () => {
    if (!projectId) { setError('Project not created yet'); return; }
    if (items.length < minItems) { setError(`Need at least ${minItems} approved ${isLibrary ? 'media items' : 'clips'} to assemble`); return; }

    setAssembling(true);
    setError('');
    setSubtitleInfo(null);

    try {
      let clipOrder;
      let libraryClipPaths = null;

      if (isLibrary) {
        // Prepare media into clips first
        setPreparingMedia(true);
        setPrepareStatus('Preparing media for assembly...');
        libraryClipPaths = await prepareLibraryClips();
        setPreparingMedia(false);

        if (libraryClipPaths.length === 0) {
          setError('Failed to prepare any clips from your media.');
          setAssembling(false);
          return;
        }
        clipOrder = libraryClipPaths.map((_, i) => i);
      } else {
        clipOrder = approvedClips.map((clip) => {
          const imgIndex = approvedImages.findIndex(img => img.id === clip.imageId);
          return imgIndex >= 0 ? imgIndex : 0;
        });
      }

      setStatusMessage('Starting assembly...');

      // Build climax-only lyrics for subtitles
      let climaxLyrics = project.lyrics || '';
      if (project.assemblySettings.addSubtitles && project.lyrics) {
        const allLines = project.lyrics.split('\n').filter(l => l.trim() && !(l.trim().startsWith('[') && l.trim().endsWith(']')));
        if (allLines.length > 0 && project.climaxStart > 0) {
          // Estimate which lines correspond to the climax segment
          // Proportional slice: climax covers climaxStart-climaxEnd out of total song
          const audioDuration = project.audioDuration || 180; // default 3 min
          const startRatio = project.climaxStart / audioDuration;
          const endRatio = project.climaxEnd / audioDuration;
          const startLine = Math.floor(startRatio * allLines.length);
          const endLine = Math.ceil(endRatio * allLines.length);
          const climaxLines = allLines.slice(startLine, Math.max(endLine, startLine + 1));
          climaxLyrics = climaxLines.join('\n');
        }
      }

      const payload = {
        projectId,
        clipOrder,
        crossfadeDuration: project.assemblySettings.crossfade,
        addTextOverlay: project.assemblySettings.addTextOverlay && (project.concept.selectedHooks || []).length > 0,
        hookText: project.concept.selectedHooks?.[0] || '',
        hookTexts: project.concept.selectedHooks || [],
        addSubtitles: project.assemblySettings.addSubtitles || false,
        lyrics: climaxLyrics,
        textFont: project.assemblySettings.textFont || 'sans',
        textSize: project.assemblySettings.textSize || 'medium',
        textColor: project.assemblySettings.textColor || 'white',
        textPosition: project.assemblySettings.textPosition || 'middle',
        textStyle: project.assemblySettings.textStyle || 'shadow',
        textAnimation: project.assemblySettings.textAnimation || 'fade',
      };

      if (isLibrary && libraryClipPaths) {
        payload.libraryClipPaths = libraryClipPaths;
        payload.videoStyle = project.assemblySettings.videoStyle || 'none';
      }

      const { data } = await api.post('/video/assemble', payload);

      if (data.jobId) {
        setJobId(data.jobId);
        setStatusMessage(data.message || 'Assembly started...');
        pollJobStatus(data.jobId);
      } else if (data.success) {
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
      setPreparingMedia(false);
    }
  };

  const handleDragStart = (index) => setDraggedIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (isLibrary) {
      const newMedia = [...(project.media || [])];
      const approvedOnly = newMedia.filter(m => m.status === 'approved');
      const dragged = approvedOnly[draggedIndex];
      approvedOnly.splice(draggedIndex, 1);
      approvedOnly.splice(index, 0, dragged);
      // Rebuild full media with reordered approved items
      const nonApproved = newMedia.filter(m => m.status !== 'approved');
      updateProject({ media: [...approvedOnly, ...nonApproved] });
    } else {
      const newClips = [...project.clips];
      const draggedClip = newClips[draggedIndex];
      newClips.splice(draggedIndex, 1);
      newClips.splice(index, 0, draggedClip);
      updateProject({ clips: newClips });
    }
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

  const totalDuration = isLibrary
    ? approvedMedia.reduce((sum, m) => sum + (m.duration || m.stillDuration || 4), 0)
    : approvedClips.reduce((sum, c) => sum + c.duration, 0);

  const accentColor = isLibrary ? '#00b4d8' : '#e94560';

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Assemble Video</h2>
        <p className="text-[#8b8b99]">
          {isLibrary
            ? 'Review your media order and configure the final video'
            : 'Arrange your clips and configure the final video'
          }
        </p>
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
          </span>
        </div>
      )}

      {/* Items Arrangement */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">
          {isLibrary ? 'Media Order' : 'Clip Order'} (drag to reorder)
        </h3>
        <div className="space-y-2">
          {items.map((item, index) => {
            const isImg = isLibrary
              ? (item.type === 'stock-photo' || item.type === 'upload-image')
              : false;
            const image = !isLibrary ? approvedImages.find(i => i.id === item.imageId) : null;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 bg-[#0c0c0f] p-3 rounded-lg border transition-all cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
                style={{ borderColor: draggedIndex === index ? accentColor : '#2a2a35' }}
                data-testid={`clip-item-${index}`}
              >
                <GripVertical className="w-5 h-5 text-[#8b8b99]" />
                <div className="w-12 h-20 rounded overflow-hidden flex-shrink-0">
                  {isLibrary && item.mediaUrl ? (
                    isImg ? (
                      <AuthImage src={`${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <AuthVideo src={`${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`} className="w-full h-full object-cover" muted />
                    )
                  ) : !isLibrary && item.clipUrl ? (
                    <AuthVideo
                      src={`${process.env.REACT_APP_BACKEND_URL}${item.clipUrl}`}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : !isLibrary && image?.url ? (
                    <AuthImage src={image.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#2a2a35]" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-[#f8f8f8] font-medium">
                    {isLibrary ? `${isImg ? (item.effect || 'Zoom In') : 'Video'} ${index + 1}` : `Clip ${index + 1}`}
                  </span>
                  <span className="text-[#8b8b99] text-sm ml-2">
                    {isLibrary ? `${item.duration || item.stillDuration || 4}s` : `${item.duration}s`}
                  </span>
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
            {project.assemblySettings.addTextOverlay && (project.concept.selectedHooks || []).length > 0 && (
              <div className="mt-1 space-y-0.5">
                {project.concept.selectedHooks.map((hook, i) => (
                  <p key={i} className="text-xs text-[#8b8b99]">"{hook}"</p>
                ))}
              </div>
            )}
            {project.assemblySettings.addTextOverlay && (project.concept.selectedHooks || []).length === 0 && (
              <p className="text-xs text-[#f59e0b] mt-1">No hooks selected — no text will be rendered</p>
            )}
          </div>
          <button
            onClick={() => updateSettings('addTextOverlay', !project.assemblySettings.addTextOverlay)}
            className={`w-12 h-6 rounded-full transition-all flex-shrink-0`}
            style={{ background: project.assemblySettings.addTextOverlay ? accentColor : '#2a2a35' }}
            data-testid="toggle-text-overlay"
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all ${
              project.assemblySettings.addTextOverlay ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Text Styling Controls — shown when text overlay is ON */}
        {project.assemblySettings.addTextOverlay && (
          <div className="bg-[#0c0c0f] border border-[#2a2a35] rounded-lg p-4 space-y-4" data-testid="text-style-controls">
            <p className="text-xs text-[#8b8b99] uppercase tracking-wider font-medium mb-2">Text Style</p>

            {/* Font Family */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8]">Font</span>
              <div className="flex gap-1">
                {[
                  { value: 'sans', label: 'Sans' },
                  { value: 'serif', label: 'Serif' },
                  { value: 'mono', label: 'Mono' },
                  { value: 'condensed', label: 'Narrow' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings('textFont', opt.value)}
                    className={`px-2.5 h-8 rounded text-xs font-medium transition-all ${
                      (project.assemblySettings.textFont || 'sans') === opt.value
                        ? 'text-white border-2'
                        : 'bg-[#2a2a35] text-[#8b8b99] border border-[#2a2a35]'
                    }`}
                    style={{
                      ...(project.assemblySettings.textFont || 'sans') === opt.value ? { background: accentColor, borderColor: accentColor } : {},
                      fontFamily: opt.value === 'serif' ? 'Georgia, serif' : opt.value === 'mono' ? 'monospace' : opt.value === 'condensed' ? 'Arial Narrow, sans-serif' : 'sans-serif',
                    }}
                    data-testid={`text-font-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8]">Size</span>
              <div className="flex gap-1">
                {[
                  { value: 'small', label: 'S' },
                  { value: 'medium', label: 'M' },
                  { value: 'large', label: 'L' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings('textSize', opt.value)}
                    className={`w-9 h-8 rounded text-xs font-bold transition-all ${
                      (project.assemblySettings.textSize || 'medium') === opt.value
                        ? 'text-white border-2'
                        : 'bg-[#2a2a35] text-[#8b8b99] border border-[#2a2a35]'
                    }`}
                    style={(project.assemblySettings.textSize || 'medium') === opt.value ? { background: accentColor, borderColor: accentColor } : {}}
                    data-testid={`text-size-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8]">Color</span>
              <div className="flex gap-1.5">
                {[
                  { value: 'white', bg: '#ffffff' },
                  { value: 'yellow', bg: '#facc15' },
                  { value: 'red', bg: '#ef4444' },
                  { value: 'cyan', bg: '#06b6d4' },
                  { value: 'lime', bg: '#84cc16' },
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => updateSettings('textColor', c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      (project.assemblySettings.textColor || 'white') === c.value ? 'border-white scale-110' : 'border-[#2a2a35]'
                    }`}
                    style={{ background: c.bg }}
                    data-testid={`text-color-${c.value}`}
                  />
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8]">Position</span>
              <div className="flex gap-1">
                {[
                  { value: 'top', label: 'Top' },
                  { value: 'middle', label: 'Mid' },
                  { value: 'bottom', label: 'Bot' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings('textPosition', opt.value)}
                    className={`px-3 h-8 rounded text-xs font-medium transition-all ${
                      (project.assemblySettings.textPosition || 'middle') === opt.value
                        ? 'text-white border-2'
                        : 'bg-[#2a2a35] text-[#8b8b99] border border-[#2a2a35]'
                    }`}
                    style={(project.assemblySettings.textPosition || 'middle') === opt.value ? { background: accentColor, borderColor: accentColor } : {}}
                    data-testid={`text-pos-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8]">Style</span>
              <div className="flex gap-1">
                {[
                  { value: 'shadow', label: 'Shadow' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'glow', label: 'Glow' },
                  { value: 'none', label: 'None' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings('textStyle', opt.value)}
                    className={`px-2.5 h-8 rounded text-xs font-medium transition-all ${
                      (project.assemblySettings.textStyle || 'shadow') === opt.value
                        ? 'text-white border-2'
                        : 'bg-[#2a2a35] text-[#8b8b99] border border-[#2a2a35]'
                    }`}
                    style={(project.assemblySettings.textStyle || 'shadow') === opt.value ? { background: accentColor, borderColor: accentColor } : {}}
                    data-testid={`text-style-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8]">Animation</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {[
                  { value: 'none', label: 'None' },
                  { value: 'fade', label: 'Fade' },
                  { value: 'slide_up', label: 'Slide Up' },
                  { value: 'slide_down', label: 'Slide Down' },
                  { value: 'pop', label: 'Pop' },
                  { value: 'bounce', label: 'Bounce' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings('textAnimation', opt.value)}
                    className={`px-2 h-7 rounded text-[11px] font-medium transition-all ${
                      (project.assemblySettings.textAnimation || 'fade') === opt.value
                        ? 'text-white border-2'
                        : 'bg-[#2a2a35] text-[#8b8b99] border border-[#2a2a35]'
                    }`}
                    style={(project.assemblySettings.textAnimation || 'fade') === opt.value ? { background: accentColor, borderColor: accentColor } : {}}
                    data-testid={`text-anim-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="mt-3 pt-3 border-t border-[#2a2a35]">
              <p className="text-xs text-[#8b8b99] uppercase tracking-wider font-medium mb-2">Preview</p>
              <div
                className="relative w-full rounded-lg overflow-hidden"
                style={{
                  aspectRatio: '9 / 16',
                  maxHeight: 280,
                  background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                }}
                data-testid="text-style-preview"
              >
                {/* Style overlay tint — shows selected videoStyle in preview */}
                {isLibrary && (() => {
                  const vs = project.assemblySettings.videoStyle || 'none';
                  const tints = {
                    cinematic_warm: 'rgba(200,120,40,0.18)',
                    dreamy: 'rgba(100,130,220,0.15)',
                    vintage: 'rgba(160,130,70,0.2)',
                    moody: 'rgba(30,40,90,0.25)',
                    raw: 'rgba(180,180,180,0.08)',
                  };
                  const t = tints[vs];
                  if (!t) return null;
                  return <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: t }} />;
                })()}

                {/* Vignette overlay for styles that use it */}
                {isLibrary && ['cinematic_warm', 'dreamy', 'vintage', 'moody'].includes(project.assemblySettings.videoStyle) && (
                  <div className="absolute inset-0 z-[1] pointer-events-none" style={{ boxShadow: 'inset 0 0 50px 15px rgba(0,0,0,0.4)' }} />
                )}

                {/* Fake image overlay */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.05) 0%, transparent 60%)' }} />

                {/* Preview text with background pill */}
                {(() => {
                  const previewText = (project.concept.selectedHooks || [])[0] || 'Sample hook text here';
                  const font = project.assemblySettings.textFont || 'sans';
                  const size = project.assemblySettings.textSize || 'medium';
                  const color = project.assemblySettings.textColor || 'white';
                  const position = project.assemblySettings.textPosition || 'middle';
                  const style = project.assemblySettings.textStyle || 'shadow';
                  const animation = project.assemblySettings.textAnimation || 'fade';

                  const fontFamily = font === 'serif' ? 'Georgia, serif' : font === 'mono' ? '"Courier New", monospace' : font === 'condensed' ? 'Arial Narrow, sans-serif' : 'system-ui, sans-serif';
                  const fontSize = size === 'small' ? 11 : size === 'large' ? 17 : 14;
                  const colorMap = { white: '#ffffff', yellow: '#facc15', red: '#ef4444', cyan: '#06b6d4', lime: '#84cc16' };
                  const textColor = colorMap[color] || '#ffffff';
                  const posMap = { top: '12%', middle: '40%', bottom: '78%' };
                  const topPos = posMap[position] || '40%';

                  let textShadow = 'none';
                  if (style === 'shadow') textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
                  else if (style === 'outline') textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 3px rgba(0,0,0,0.8)';
                  else if (style === 'glow') textShadow = '0 0 8px rgba(255,255,255,0.5), 0 0 2px rgba(0,0,0,0.6)';

                  const animClass = animation === 'fade' ? 'animate-pulse' : animation === 'slide_up' ? 'animate-bounce' : '';

                  return (
                    <div
                      className={`absolute left-0 right-0 px-3 text-center transition-all z-[2] ${animClass}`}
                      style={{
                        top: topPos,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {/* Background pill */}
                      <div
                        className="inline-block rounded-md px-4 py-2"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                      >
                        <span
                          style={{
                            fontFamily,
                            fontSize,
                            fontWeight: 700,
                            color: textColor,
                            textShadow,
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                          }}
                        >
                          {previewText}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Frame label */}
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-[9px] text-[#8b8b99]/60 uppercase tracking-widest">9:16 Preview</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Crossfade */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#f8f8f8]">Crossfade duration</span>
            <span className="font-mono" style={{ color: accentColor }}>{project.assemblySettings.crossfade}s</span>
          </div>
          <input
            type="range" min="0.3" max="1.0" step="0.1"
            value={project.assemblySettings.crossfade}
            onChange={(e) => updateSettings('crossfade', parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor }}
            data-testid="crossfade-slider"
          />
        </div>

        {/* Video Style — Library mode only */}
        {isLibrary && (
          <div data-testid="video-style-section">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#f8f8f8]">Video Style</span>
              <span className="text-[10px] text-[#8b8b99] bg-[#2a2a35] px-1.5 py-0.5 rounded">Library</span>
            </div>
            <p className="text-xs text-[#8b8b99] mb-3">
              Apply cinematic color grading to give stock footage a cohesive, branded look.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'none', label: 'None', desc: 'Original look', preview: 'transparent' },
                { value: 'cinematic_warm', label: 'Cinematic', desc: 'Warm tones + vignette', preview: 'linear-gradient(135deg, rgba(255,140,50,0.25) 0%, rgba(180,80,40,0.15) 100%)' },
                { value: 'dreamy', label: 'Dreamy', desc: 'Soft + lifted blues', preview: 'linear-gradient(135deg, rgba(100,140,220,0.25) 0%, rgba(180,160,220,0.2) 100%)' },
                { value: 'vintage', label: 'Vintage', desc: 'Faded + grain', preview: 'linear-gradient(135deg, rgba(180,140,80,0.3) 0%, rgba(120,100,60,0.2) 100%)' },
                { value: 'moody', label: 'Moody', desc: 'Dark + cool tones', preview: 'linear-gradient(135deg, rgba(40,50,100,0.35) 0%, rgba(20,30,60,0.25) 100%)' },
                { value: 'raw', label: 'Raw', desc: 'Punchy + grain', preview: 'linear-gradient(135deg, rgba(200,200,200,0.15) 0%, rgba(150,150,150,0.1) 100%)' },
              ].map(opt => {
                const selected = (project.assemblySettings.videoStyle || 'none') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings('videoStyle', opt.value)}
                    className={`relative rounded-lg p-2.5 text-left transition-all border-2 ${
                      selected ? 'border-current text-white' : 'border-[#2a2a35] text-[#8b8b99] hover:border-[#3a3a45]'
                    }`}
                    style={selected ? { borderColor: accentColor } : {}}
                    data-testid={`video-style-${opt.value}`}
                  >
                    <div
                      className="w-full h-8 rounded mb-1.5"
                      style={{
                        background: opt.value === 'none'
                          ? 'repeating-conic-gradient(#2a2a35 0% 25%, #1a1a22 0% 50%) 0 0 / 8px 8px'
                          : opt.preview,
                      }}
                    />
                    <span className="text-xs font-medium block">{opt.label}</span>
                    <span className="text-[10px] text-[#666] block leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Subtitles Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#f8f8f8]">Add subtitles from lyrics</span>
            {project.assemblySettings.addSubtitles && (
              <p className="text-xs text-[#8b8b99] mt-1">
                {project.lyrics
                  ? `Using lyrics from climax segment only`
                  : 'No lyrics found — add lyrics in Step 1'
                }
              </p>
            )}
          </div>
          <button
            onClick={() => updateSettings('addSubtitles', !project.assemblySettings.addSubtitles)}
            className={`w-12 h-6 rounded-full transition-all flex-shrink-0`}
            style={{ background: project.assemblySettings.addSubtitles ? accentColor : '#2a2a35' }}
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
        <div className="bg-[#141418] border rounded-xl p-8" style={{ borderColor: `${accentColor}50` }} data-testid="assembly-progress">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: accentColor }} />
            <div className="text-center">
              <p className="text-[#f8f8f8] font-medium text-lg">
                {preparingMedia ? 'Preparing media...' : 'Assembling your video...'}
              </p>
              <p className="text-[#8b8b99] text-sm mt-1">{preparingMedia ? prepareStatus : statusMessage}</p>
            </div>
            <div className="w-full max-w-xs bg-[#0c0c0f] rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: accentColor }} />
            </div>
            <p className="text-xs text-[#8b8b99]">This may take 1-3 minutes. Please don't close this page.</p>
          </div>
        </div>
      ) : !project.assembledVideo ? (
        <div className="flex justify-center">
          <button
            onClick={handleAssemble}
            disabled={items.length < minItems}
            className="flex items-center gap-2 px-8 py-4 text-white rounded-lg transition-all disabled:opacity-50"
            style={{ background: accentColor }}
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
        Total estimated duration: <span className="text-[#f8f8f8]">{totalDuration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
