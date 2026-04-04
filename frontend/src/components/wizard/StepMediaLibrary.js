import React, { useState, useRef, useCallback } from 'react';
import {
  Search, Upload, ImageIcon, Film, Loader2, X, GripVertical,
  Play, Check, Trash2, Clock, Wand2, Copy, CheckCheck
} from 'lucide-react';
import api from '../../lib/api';
import { AuthImage, AuthVideo } from '../AuthImage';

export default function StepMediaLibrary({ project, updateProject, projectId, createProject }) {
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('photos'); // photos | videos
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [error, setError] = useState('');
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const fileInputRef = useRef(null);

  const media = project.media || [];

  const ensureProject = async () => {
    if (projectId) return projectId;
    if (createProject) {
      const id = await createProject();
      return id;
    }
    return null;
  };

  const updateMedia = useCallback((newMedia) => {
    updateProject({ media: newMedia });
  }, [updateProject]);

  // ---- Stock Search ----
  const handleSearch = async (page = 1) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const endpoint = searchType === 'videos' ? '/stock/search/videos' : '/stock/search/photos';
      const { data } = await api.get(endpoint, {
        params: { query: searchQuery, page, per_page: 20 }
      });
      const results = data.photos || data.videos || [];
      if (page === 1) {
        setSearchResults(results);
      } else {
        setSearchResults(prev => [...prev, ...results]);
      }
      setSearchPage(page);
      setHasMoreResults(data.hasMore);
    } catch (err) {
      console.error('Stock search failed:', err);
      const detail = err.response?.data?.detail || 'Search failed. Check your Pexels API key in Settings.';
      setError(detail);
    } finally {
      setSearching(false);
    }
  };

  const handleAddStock = async (item) => {
    if (media.some(m => m.id === item.id)) return; // already added
    setProcessingItems(prev => new Set([...prev, item.id]));
    setError('');
    try {
      const pid = await ensureProject();
      if (!pid) {
        setError('Project not created yet. Please go back to Step 1 and enter a title.');
        return;
      }
      // Download to server
      const { data } = await api.post(`/projects/${pid}/media/download-stock`, {
        sourceUrl: item.sourceUrl,
        type: item.type,
      });

      const newItem = {
        id: item.id,
        type: item.type,
        thumbnailUrl: item.thumbnailUrl,
        sourceUrl: item.sourceUrl,
        localPath: data.localPath,
        mediaUrl: data.mediaUrl,
        duration: data.duration || 0,
        animate: false,
        stillDuration: 4,
        clipUrl: '',
        clipPath: '',
        clipDuration: 0,
        status: 'pending',
        photographer: item.photographer || item.user || '',
        pexelsId: item.pexelsId,
      };

      updateMedia([...media, newItem]);
    } catch (err) {
      console.error('Failed to add stock item:', err);
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // ---- File Upload ----
  const handleUpload = async (files) => {
    if (!files.length) return;
    setError('');
    const pid = await ensureProject();
    if (!pid) {
      setError('Project not created yet. Please go back to Step 1 and enter a title.');
      return;
    }
    setUploading(true);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post(
          `/projects/${pid}/media/upload`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const newItem = {
          id: data.id,
          type: data.type,
          thumbnailUrl: data.mediaUrl,
          sourceUrl: '',
          localPath: data.localPath,
          mediaUrl: data.mediaUrl,
          duration: data.duration || 0,
          animate: false,
          stillDuration: 4,
          clipUrl: '',
          clipPath: '',
          clipDuration: 0,
          status: 'pending',
          filename: data.filename,
        };

        updateMedia([...(project.media || []), newItem]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  // ---- Media Pool Actions ----
  const removeMedia = (id) => {
    updateMedia(media.filter(m => m.id !== id));
  };

  const toggleAnimate = (id) => {
    updateMedia(media.map(m =>
      m.id === id ? { ...m, animate: !m.animate } : m
    ));
  };

  const updateStillDuration = (id, dur) => {
    updateMedia(media.map(m =>
      m.id === id ? { ...m, stillDuration: dur } : m
    ));
  };

  const approveItem = (id) => {
    updateMedia(media.map(m =>
      m.id === id ? { ...m, status: 'approved' } : m
    ));
  };

  const approveAll = () => {
    updateMedia(media.map(m =>
      m.status === 'pending' ? { ...m, status: 'approved' } : m
    ));
  };

  const rejectAll = () => {
    updateMedia(media.map(m =>
      m.status === 'pending' ? { ...m, status: 'rejected' } : m
    ));
  };

  // ---- Drag & Drop Reorder ----
  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...media];
    const dragged = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, dragged);
    updateMedia(reordered);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  const pendingCount = media.filter(m => m.status === 'pending').length;
  const approvedCount = media.filter(m => m.status === 'approved').length;
  const isImage = (type) => type === 'stock-photo' || type === 'upload-image';

  const imagePrompts = project.imagePrompts || [];

  const handleGeneratePrompts = async () => {
    if (!project.title?.trim() && !project.lyrics?.trim()) {
      setError('Add a song title or lyrics in Step 1 to generate image prompts.');
      return;
    }
    setGeneratingPrompts(true);
    setError('');
    try {
      const { data } = await api.post('/ai/generate-image-prompts', {
        projectId,
        title: project.title || '',
        lyrics: project.lyrics || '',
        genre: project.genre || '',
      });
      if (data.prompts?.length > 0) {
        updateProject({ imagePrompts: data.prompts });
      }
    } catch (err) {
      console.error('Prompt generation failed:', err);
      setError(err.response?.data?.detail || 'Failed to generate prompts. Check your OpenAI key in Settings.');
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const handleCopyPrompt = async (prompt, index) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Media Library</h2>
        <p className="text-[#8b8b99]">Search stock media, upload your own, then arrange your clips</p>
      </div>

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg text-sm" data-testid="media-library-error">
          {error}
        </div>
      )}

      {/* AI Image Prompts Section */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#00b4d8]" />
            <h3 className="font-heading font-semibold text-[#f8f8f8]">AI Image Prompts</h3>
          </div>
          <button
            onClick={handleGeneratePrompts}
            disabled={generatingPrompts}
            className="flex items-center gap-2 px-4 py-2 bg-[#00b4d8] text-white rounded-lg hover:bg-[#0096b7] text-sm disabled:opacity-50 transition-all"
            data-testid="generate-prompts-button"
          >
            {generatingPrompts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generatingPrompts ? 'Generating...' : imagePrompts.length > 0 ? 'Regenerate Prompts' : 'Generate Prompts'}
          </button>
        </div>
        <p className="text-xs text-[#8b8b99]">
          Generate 7 cinematic image prompts based on your song. Copy them to Midjourney, FLUX, or any image tool.
        </p>

        {generatingPrompts && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 text-[#00b4d8] animate-spin" />
            <span className="text-[#8b8b99] text-sm">Generating prompts from your lyrics...</span>
          </div>
        )}

        {!generatingPrompts && imagePrompts.length > 0 && (
          <div className="space-y-3">
            {imagePrompts.map((prompt, i) => (
              <div key={i} className="flex gap-3 bg-[#0c0c0f] p-3 rounded-lg border border-[#2a2a35]">
                <span className="text-[#00b4d8] font-mono text-sm font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-[#f8f8f8] text-sm leading-relaxed flex-1">{prompt}</p>
                <button
                  onClick={() => handleCopyPrompt(prompt, i)}
                  className="flex-shrink-0 p-2 text-[#8b8b99] hover:text-[#00b4d8] hover:bg-[#00b4d8]/10 rounded-lg transition-all"
                  title="Copy to clipboard"
                  data-testid={`copy-prompt-${i}`}
                >
                  {copiedIndex === i ? <CheckCheck className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {!generatingPrompts && imagePrompts.length === 0 && (
          <p className="text-sm text-[#8b8b99] py-3 text-center">
            Click "Generate Prompts" to create 7 cinematic image prompts from your song.
          </p>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[#0c0c0f] rounded-xl p-1 border border-[#2a2a35]">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'stock' ? 'bg-[#00b4d8] text-white' : 'text-[#8b8b99] hover:text-[#f8f8f8]'
          }`}
          data-testid="tab-stock-search"
        >
          <Search className="w-4 h-4" />
          Stock Search
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'upload' ? 'bg-[#00b4d8] text-white' : 'text-[#8b8b99] hover:text-[#f8f8f8]'
          }`}
          data-testid="tab-my-uploads"
        >
          <Upload className="w-4 h-4" />
          My Uploads
        </button>
      </div>

      {/* Stock Search Tab */}
      {activeTab === 'stock' && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-5 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8b99]" />
              <input
                type="text"
                placeholder="Search Pexels (e.g. cinematic rain, city lights, emotional portrait...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg text-[#f8f8f8] text-sm focus:outline-none focus:border-[#00b4d8]"
                data-testid="stock-search-input"
              />
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-[#00b4d8] text-white rounded-lg hover:bg-[#0096b7] text-sm font-medium disabled:opacity-50 transition-all"
              data-testid="stock-search-button"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2">
            {['photos', 'videos'].map(type => (
              <button
                key={type}
                onClick={() => { setSearchType(type); setSearchResults([]); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  searchType === type
                    ? 'bg-[#00b4d8]/20 text-[#00b4d8] border border-[#00b4d8]/40'
                    : 'bg-[#0c0c0f] text-[#8b8b99] border border-[#2a2a35] hover:text-[#f8f8f8]'
                }`}
                data-testid={`search-type-${type}`}
              >
                {type === 'photos' ? <ImageIcon className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                {type === 'photos' ? 'Photos' : 'Videos'}
              </button>
            ))}
          </div>

          {/* Results Grid */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {searchResults.map((item) => {
                const alreadyAdded = media.some(m => m.id === item.id);
                const isProcessing = processingItems.has(item.id);
                return (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden border border-[#2a2a35] bg-[#0c0c0f]">
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full aspect-[9/16] object-cover"
                      loading="lazy"
                    />
                    {item.duration > 0 && (
                      <div className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                        <Play className="w-2.5 h-2.5" /> {item.duration}s
                      </div>
                    )}
                    <button
                      onClick={() => handleAddStock(item)}
                      disabled={alreadyAdded || isProcessing}
                      className={`absolute inset-0 flex items-center justify-center transition-all ${
                        alreadyAdded
                          ? 'bg-[#10b981]/30'
                          : 'bg-black/0 group-hover:bg-black/50'
                      }`}
                      data-testid={`add-stock-${item.id}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : alreadyAdded ? (
                        <Check className="w-6 h-6 text-[#10b981]" />
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 bg-[#00b4d8] text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity">
                          + Add
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {hasMoreResults && (
            <button
              onClick={() => handleSearch(searchPage + 1)}
              disabled={searching}
              className="w-full py-2 text-[#00b4d8] text-sm hover:underline disabled:opacity-50"
              data-testid="load-more-results"
            >
              {searching ? 'Loading...' : 'Load more results'}
            </button>
          )}

          {searchResults.length > 0 && (
            <p className="text-[10px] text-[#8b8b99] text-center">Photos &amp; videos provided by Pexels</p>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="bg-[#141418] border-2 border-dashed border-[#2a2a35] rounded-xl p-10 text-center hover:border-[#00b4d8]/50 transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          data-testid="upload-drop-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleUpload(Array.from(e.target.files))}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#00b4d8] animate-spin" />
              <p className="text-[#f8f8f8]">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-[#8b8b99]" />
              <p className="text-[#f8f8f8] font-medium">Drop images or videos here</p>
              <p className="text-[#8b8b99] text-sm">or click to browse — JPG, PNG, WebP, MP4, MOV</p>
            </div>
          )}
        </div>
      )}

      {/* Media Pool */}
      {media.length > 0 && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-[#f8f8f8]">
              Media Pool ({media.length} items)
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#10b981]">{approvedCount} approved</span>
              <span className="text-[#8b8b99]">{pendingCount} pending</span>
            </div>
          </div>

          {/* Bulk actions */}
          {pendingCount > 0 && (
            <div className="flex gap-2">
              <button
                onClick={approveAll}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] text-sm transition-all"
                data-testid="approve-all-media"
              >
                <Check className="w-4 h-4" /> Approve All ({pendingCount})
              </button>
              <button
                onClick={rejectAll}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] text-sm transition-all"
                data-testid="reject-all-media"
              >
                <X className="w-4 h-4" /> Reject All ({pendingCount})
              </button>
            </div>
          )}

          {/* Media Items */}
          <div className="space-y-2">
            {media.filter(m => m.status !== 'rejected').map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 bg-[#0c0c0f] p-3 rounded-lg border transition-all cursor-move ${
                  draggedIndex === index ? 'border-[#00b4d8] opacity-50' : 'border-[#2a2a35]'
                } ${item.status === 'approved' ? 'ring-1 ring-[#10b981]/30' : ''}`}
                data-testid={`media-item-${item.id}`}
              >
                <GripVertical className="w-4 h-4 text-[#8b8b99] flex-shrink-0" />

                {/* Thumbnail */}
                <div className="w-12 h-20 rounded overflow-hidden flex-shrink-0 bg-[#2a2a35]">
                  {item.mediaUrl ? (
                    isImage(item.type) ? (
                      <AuthImage src={`${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <AuthVideo src={`${process.env.REACT_APP_BACKEND_URL}${item.mediaUrl}`} className="w-full h-full object-cover" muted />
                    )
                  ) : item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isImage(item.type) ? (
                      <ImageIcon className="w-3.5 h-3.5 text-[#00b4d8]" />
                    ) : (
                      <Film className="w-3.5 h-3.5 text-[#f59e0b]" />
                    )}
                    <span className="text-[#f8f8f8] text-sm font-medium truncate">
                      {item.filename || (item.type.includes('stock') ? `Pexels ${item.pexelsId}` : `Item ${index + 1}`)}
                    </span>
                    {item.status === 'approved' && <Check className="w-3.5 h-3.5 text-[#10b981]" />}
                  </div>

                  {/* Controls based on type */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {isImage(item.type) && (
                      <>
                        {/* Animate toggle */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAnimate(item.id); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                            item.animate
                              ? 'bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/30'
                              : 'bg-[#2a2a35] text-[#8b8b99] border border-[#2a2a35]'
                          }`}
                          data-testid={`toggle-animate-${item.id}`}
                        >
                          <Play className="w-3 h-3" />
                          {item.animate ? 'Animate ON' : 'Still'}
                        </button>

                        {/* Duration slider (only for stills) */}
                        {!item.animate && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#8b8b99]" />
                            <input
                              type="range"
                              min="2" max="8" step="0.5"
                              value={item.stillDuration || 4}
                              onChange={(e) => { e.stopPropagation(); updateStillDuration(item.id, parseFloat(e.target.value)); }}
                              className="w-20 h-1 accent-[#00b4d8]"
                              data-testid={`duration-slider-${item.id}`}
                            />
                            <span className="text-[11px] text-[#8b8b99] w-6">{item.stillDuration || 4}s</span>
                          </div>
                        )}
                      </>
                    )}
                    {!isImage(item.type) && item.duration > 0 && (
                      <span className="text-[11px] text-[#8b8b99] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.duration}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status !== 'approved' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); approveItem(item.id); }}
                      className="p-1.5 text-[#10b981] hover:bg-[#10b981]/10 rounded transition-all"
                      title="Approve"
                      data-testid={`approve-media-${item.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeMedia(item.id); }}
                    className="p-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-all"
                    title="Remove"
                    data-testid={`remove-media-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
