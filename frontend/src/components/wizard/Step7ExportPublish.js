import React, { useState } from 'react';
import { Download, Copy, Check, Film, ArrowRight, Smartphone, Loader2, Wand2, ImageIcon, Clock, CheckCheck } from 'lucide-react';
import { AuthVideo, AuthImage } from '../AuthImage';
import api from '../../lib/api';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${API_BASE}/api`;

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', color: '#ff0050', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
  { id: 'youtube', name: 'YouTube Shorts', color: '#ff0000', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
  { id: 'instagram', name: 'Instagram Reels', color: '#e1306c', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
  { id: 'facebook', name: 'Facebook Reels', color: '#1877f2', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
];

export default function Step7ExportPublish({ project, updateProject, projectId, onCreateAnother }) {
  const [copiedField, setCopiedField] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [generatingThumb, setGeneratingThumb] = useState(null);
  const [activeMetaTab, setActiveMetaTab] = useState('tiktok');
  const [metaError, setMetaError] = useState('');
  const [editingMeta, setEditingMeta] = useState({});

  const isLibrary = project.mode === 'library';
  const accentColor = isLibrary ? '#00b4d8' : '#e94560';

  const approvedClips = project.clips?.filter(c => c.status === 'approved') || [];
  const approvedMedia = (project.media || []).filter(m => m.status === 'approved');
  const totalDuration = isLibrary
    ? approvedMedia.reduce((sum, m) => sum + (m.duration || m.stillDuration || 4), 0)
    : approvedClips.reduce((sum, c) => sum + c.duration, 0);
  const totalCost = (project.costs?.images || 0) + (project.costs?.clips || 0) + (project.costs?.assembly || 0);

  const metadata = project.metadata || {};
  const thumbnails = project.thumbnails || {};
  const hasMetadata = Object.keys(metadata).length > 0;

  const handleCopy = async (field, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownload = async (platformId) => {
    if (!projectId) return;
    setDownloading(platformId);
    try {
      const downloadUrl = `${API}/projects/${projectId}/download/${platformId}`;
      const token = localStorage.getItem('access_token');
      const response = await fetch(downloadUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${platformId}_${project.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadZip = async () => {
    if (!projectId) return;
    setDownloading('zip');
    try {
      const downloadUrl = `${API}/projects/${projectId}/download-zip`;
      const token = localStorage.getItem('access_token');
      const response = await fetch(downloadUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'project'}_files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  // ---- Metadata Generation ----
  const handleGenerateMetadata = async () => {
    setGeneratingMeta(true);
    setMetaError('');
    try {
      const { data } = await api.post('/ai/generate-metadata', {
        projectId,
        title: project.title || '',
        genre: project.genre || '',
        lyrics: project.lyrics || '',
        hooks: project.concept?.selectedHooks || [],
      });
      if (data.metadata) {
        updateProject({ metadata: data.metadata });
        setEditingMeta({});
      }
    } catch (err) {
      console.error('Metadata generation failed:', err);
      setMetaError(err.response?.data?.detail || 'Failed to generate metadata. Check your OpenAI key in Settings.');
    } finally {
      setGeneratingMeta(false);
    }
  };

  // ---- Thumbnail Generation ----
  const handleGenerateThumbnail = async (platformId) => {
    setGeneratingThumb(platformId);
    try {
      const { data } = await api.post('/ai/generate-thumbnail', {
        projectId,
        platform: platformId,
        title: project.title || '',
        mood: project.concept?.mood || '',
        genre: project.genre || '',
      });
      if (data.thumbnailUrl) {
        updateProject({
          thumbnails: { ...(project.thumbnails || {}), [platformId]: data.thumbnailUrl }
        });
      }
    } catch (err) {
      console.error('Thumbnail generation failed:', err);
    } finally {
      setGeneratingThumb(null);
    }
  };

  const handleDownloadThumbnail = async (platformId) => {
    const thumbUrl = thumbnails[platformId];
    if (!thumbUrl) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}${thumbUrl}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail_${platformId}_${project.title || 'cover'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Thumbnail download failed:', err);
    }
  };

  // ---- Edit metadata fields ----
  const getMetaField = (platform, field) => {
    const editKey = `${platform}_${field}`;
    if (editingMeta[editKey] !== undefined) return editingMeta[editKey];
    return metadata[platform]?.[field] || '';
  };

  const setMetaField = (platform, field, value) => {
    const editKey = `${platform}_${field}`;
    setEditingMeta(prev => ({ ...prev, [editKey]: value }));
    // Also update project state
    const updated = {
      ...metadata,
      [platform]: { ...metadata[platform], [field]: value }
    };
    updateProject({ metadata: updated });
  };

  const copyAllForPlatform = (platformId) => {
    const pm = metadata[platformId];
    if (!pm) return;
    const text = `${pm.title}\n\n${pm.description}\n\n${pm.hashtags}`;
    handleCopy(`all_${platformId}`, text);
  };

  const activePlatform = PLATFORMS.find(p => p.id === activeMetaTab) || PLATFORMS[0];
  const activeMeta = metadata[activeMetaTab] || {};

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Export & Publish</h2>
        <p className="text-[#8b8b99]">Download your video, generate metadata, and create thumbnails</p>
      </div>

      {/* Video Preview */}
      {project.assembledVideo?.url && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
          <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Final Video Preview</h3>
          <div className="aspect-video bg-[#0c0c0f] rounded-lg overflow-hidden">
            <AuthVideo
              src={`${API_BASE}${project.assembledVideo.url}`}
              className="w-full h-full"
              controls
              playsInline
            />
          </div>
        </div>
      )}

      {/* Download Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLATFORMS.map((platform) => (
          <div key={platform.id} className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${platform.color}20` }}>
              <Film className="w-4 h-4" style={{ color: platform.color }} />
            </div>
            <h4 className="text-[#f8f8f8] text-sm font-medium mb-1">{platform.name}</h4>
            <p className="text-[10px] text-[#8b8b99] mb-3">{platform.resolution} • {platform.ratio}</p>
            <button
              onClick={() => handleDownload(platform.id)}
              disabled={downloading !== null || !project.assembledVideo}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
              style={{ background: accentColor }}
              data-testid={`download-${platform.id}`}
            >
              {downloading === platform.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Download
            </button>
          </div>
        ))}
      </div>

      {/* Download ZIP */}
      <div className="flex justify-center">
        <button
          onClick={handleDownloadZip}
          disabled={downloading !== null}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#141418] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] text-sm disabled:opacity-50 transition-all"
          data-testid="download-zip"
        >
          {downloading === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download All as ZIP
        </button>
      </div>

      {/* ====== METADATA SECTION ====== */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" style={{ color: accentColor }} />
            <h3 className="font-heading font-semibold text-[#f8f8f8]">Platform Metadata</h3>
          </div>
          <button
            onClick={handleGenerateMetadata}
            disabled={generatingMeta}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
            style={{ background: accentColor }}
            data-testid="generate-metadata-button"
          >
            {generatingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generatingMeta ? 'Generating...' : hasMetadata ? 'Regenerate' : 'Generate for All Platforms'}
          </button>
        </div>
        <p className="text-xs text-[#8b8b99]">
          AI generates optimized titles, descriptions, hashtags, and posting times for each platform (~$0.01).
        </p>

        {metaError && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg text-sm" data-testid="metadata-error">
            {metaError}
          </div>
        )}

        {generatingMeta && (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
            <span className="text-[#8b8b99]">Generating metadata for all platforms...</span>
          </div>
        )}

        {!generatingMeta && hasMetadata && (
          <>
            {/* Platform Tabs */}
            <div className="flex gap-1 bg-[#0c0c0f] rounded-xl p-1 border border-[#2a2a35]">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveMetaTab(p.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeMetaTab === p.id ? 'text-white' : 'text-[#8b8b99] hover:text-[#f8f8f8]'
                  }`}
                  style={activeMetaTab === p.id ? { background: p.color } : undefined}
                  data-testid={`meta-tab-${p.id}`}
                >
                  <Film className="w-3 h-3" />
                  <span className="hidden sm:inline">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Active Platform Card */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#8b8b99] uppercase tracking-wider">Title</span>
                  <button
                    onClick={() => handleCopy(`title_${activeMetaTab}`, getMetaField(activeMetaTab, 'title'))}
                    className="text-[#8b8b99] hover:text-[#f8f8f8] transition-all"
                  >
                    {copiedField === `title_${activeMetaTab}` ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </label>
                <input
                  type="text"
                  value={getMetaField(activeMetaTab, 'title')}
                  onChange={(e) => setMetaField(activeMetaTab, 'title', e.target.value)}
                  className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-[#f8f8f8] text-sm focus:outline-none focus:border-[#8b8b99]"
                  data-testid={`meta-title-${activeMetaTab}`}
                />
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#8b8b99] uppercase tracking-wider">Description</span>
                  <button
                    onClick={() => handleCopy(`desc_${activeMetaTab}`, getMetaField(activeMetaTab, 'description'))}
                    className="text-[#8b8b99] hover:text-[#f8f8f8] transition-all"
                  >
                    {copiedField === `desc_${activeMetaTab}` ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </label>
                <textarea
                  value={getMetaField(activeMetaTab, 'description')}
                  onChange={(e) => setMetaField(activeMetaTab, 'description', e.target.value)}
                  rows={3}
                  className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-[#f8f8f8] text-sm focus:outline-none focus:border-[#8b8b99] resize-none"
                  data-testid={`meta-desc-${activeMetaTab}`}
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#8b8b99] uppercase tracking-wider">Hashtags</span>
                  <button
                    onClick={() => handleCopy(`tags_${activeMetaTab}`, getMetaField(activeMetaTab, 'hashtags'))}
                    className="text-[#8b8b99] hover:text-[#f8f8f8] transition-all"
                  >
                    {copiedField === `tags_${activeMetaTab}` ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </label>
                <textarea
                  value={getMetaField(activeMetaTab, 'hashtags')}
                  onChange={(e) => setMetaField(activeMetaTab, 'hashtags', e.target.value)}
                  rows={2}
                  className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-[#f8f8f8] text-sm focus:outline-none focus:border-[#8b8b99] resize-none"
                  style={{ color: activePlatform.color }}
                  data-testid={`meta-hashtags-${activeMetaTab}`}
                />
              </div>

              {/* Best Time */}
              {activeMeta.bestTime && (
                <div className="flex items-center gap-2 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3">
                  <Clock className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#8b8b99] uppercase tracking-wider">Best posting time</span>
                    <p className="text-sm text-[#f8f8f8]">{activeMeta.bestTime}</p>
                  </div>
                </div>
              )}

              {/* Copy All + Thumbnail Row */}
              <div className="flex gap-3">
                <button
                  onClick={() => copyAllForPlatform(activeMetaTab)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] text-sm transition-all"
                  data-testid={`copy-all-${activeMetaTab}`}
                >
                  {copiedField === `all_${activeMetaTab}` ? (
                    <><CheckCheck className="w-4 h-4 text-[#10b981]" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy All</>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateThumbnail(activeMetaTab)}
                  disabled={generatingThumb !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                  style={{ borderColor: activePlatform.color, color: activePlatform.color }}
                  data-testid={`generate-thumb-${activeMetaTab}`}
                >
                  {generatingThumb === activeMetaTab ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><ImageIcon className="w-4 h-4" /> {thumbnails[activeMetaTab] ? 'Regenerate' : 'Generate'} Thumbnail</>
                  )}
                </button>
              </div>

              {/* Thumbnail Preview */}
              {thumbnails[activeMetaTab] && (
                <div className="border border-[#2a2a35] rounded-lg overflow-hidden">
                  <AuthImage
                    src={`${API_BASE}${thumbnails[activeMetaTab]}`}
                    alt={`${activePlatform.name} thumbnail`}
                    className="w-full max-h-[300px] object-contain bg-[#0c0c0f]"
                  />
                  <div className="flex items-center justify-between px-4 py-2 bg-[#0c0c0f] border-t border-[#2a2a35]">
                    <span className="text-xs text-[#8b8b99]">{activePlatform.name} thumbnail ($0.005)</span>
                    <button
                      onClick={() => handleDownloadThumbnail(activeMetaTab)}
                      className="flex items-center gap-1 text-sm hover:underline transition-all"
                      style={{ color: activePlatform.color }}
                      data-testid={`download-thumb-${activeMetaTab}`}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!generatingMeta && !hasMetadata && (
          <p className="text-sm text-[#8b8b99] py-4 text-center">
            Click "Generate for All Platforms" to create optimized metadata for TikTok, YouTube, Instagram, and Facebook.
          </p>
        )}
      </div>

      {/* Project Summary */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Project Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Film className="w-6 h-6 mx-auto mb-2" style={{ color: accentColor }} />
            <p className="text-sm text-[#8b8b99]">Song</p>
            <p className="text-[#f8f8f8] font-medium truncate">{project.title || 'Untitled'}</p>
          </div>
          <div className="text-center">
            <span className="text-2xl block mb-2">{project.template?.emoji || '🎬'}</span>
            <p className="text-sm text-[#8b8b99]">Mode</p>
            <p className="text-[#f8f8f8] font-medium">{isLibrary ? 'Library' : 'AI'}</p>
          </div>
          <div className="text-center">
            <Smartphone className="w-6 h-6 mx-auto mb-2" style={{ color: accentColor }} />
            <p className="text-sm text-[#8b8b99]">Duration</p>
            <p className="text-[#f8f8f8] font-medium">{totalDuration.toFixed(1)}s</p>
          </div>
          <div className="text-center">
            <span className="text-2xl block mb-2">$</span>
            <p className="text-sm text-[#8b8b99]">Total Cost</p>
            <p className="font-heading font-semibold" style={{ color: accentColor }}>${totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Create Another */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onCreateAnother}
          className="flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-all"
          style={{ background: accentColor }}
          data-testid="create-another"
        >
          Create Another Video
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
