import React, { useState } from 'react';
import { Download, Copy, Check, Film, ArrowRight, Smartphone, Loader2 } from 'lucide-react';
import { AuthVideo } from '../AuthImage';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${API_BASE}/api`;

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: '🎵', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
  { id: 'youtube', name: 'YouTube Shorts', icon: '▶️', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
  { id: 'instagram', name: 'Instagram Reels', icon: '📸', resolution: '1080x1920', ratio: '9:16', format: 'MP4' },
];

export default function Step7ExportPublish({ project, projectId, onCreateAnother }) {
  const [copiedField, setCopiedField] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const totalCost = project.costs.images + project.costs.clips + project.costs.assembly;
  const approvedClips = project.clips.filter(c => c.status === 'approved');
  const totalDuration = approvedClips.reduce((sum, c) => sum + c.duration, 0);

  // Generated content
  const publishingInfo = {
    title: project.title || 'Untitled',
    description: `${project.concept.mood || 'A visual journey'} | ${project.genre || 'Music Video'}`,
    tags: `#${(project.genre || 'music').replace(/\s+/g, '')} #musicvideo #shorts #${(project.concept.theme || 'vibes').split(' ')[0]?.replace(/[^a-zA-Z]/g, '') || 'aesthetic'}`,
  };

  const handleCopy = async (field, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownload = async (platformId) => {
    if (!projectId) return;

    setDownloading(platformId);

    try {
      // Create a download link
      const downloadUrl = `${API}/projects/${projectId}/download/${platformId}`;

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', '');

      // We need to include auth token in the request
      const token = localStorage.getItem('access_token');
      const response = await fetch(downloadUrl, {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

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
      alert('Download failed. Please make sure the video is assembled first.');
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
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

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
      alert('ZIP download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Export & Publish
        </h2>
        <p className="text-[#8b8b99]">
          Download your video and copy publishing info
        </p>
      </div>

      {/* Video Preview */}
      {project.assembledVideo?.url && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
          <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Final Video Preview</h3>
          <div className="aspect-video bg-[#0c0c0f] rounded-lg overflow-hidden">
            <AuthVideo
              src={`${process.env.REACT_APP_BACKEND_URL}${project.assembledVideo.url}`}
              className="w-full h-full"
              controls
              playsInline
            />
          </div>
        </div>
      )}

      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => (
          <div
            key={platform.id}
            className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6 text-center hover:border-[#e94560]/50 transition-all"
          >
            <div className="text-4xl mb-3">{platform.icon}</div>
            <h3 className="font-heading font-semibold text-[#f8f8f8] mb-2">{platform.name}</h3>
            <div className="text-sm text-[#8b8b99] mb-4">
              <p>{platform.resolution}</p>
              <p>{platform.ratio} • {platform.format}</p>
            </div>
            <button
              onClick={() => handleDownload(platform.id)}
              disabled={downloading !== null || !project.assembledVideo}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
              data-testid={`download-${platform.id}`}
            >
              {downloading === platform.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Download All as ZIP */}
      <div className="flex justify-center">
        <button
          onClick={handleDownloadZip}
          disabled={downloading !== null}
          className="flex items-center gap-2 px-6 py-3 bg-[#141418] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all disabled:opacity-50"
          data-testid="download-zip"
        >
          {downloading === 'zip' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating ZIP...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download as ZIP (all files)
            </>
          )}
        </button>
      </div>

      {/* Publishing Info */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6 space-y-4">
        <h3 className="font-heading font-semibold text-[#f8f8f8]">Publishing Info</h3>

        {/* Title */}
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Title</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={publishingInfo.title}
              readOnly
              className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2 text-[#f8f8f8]"
            />
            <button
              onClick={() => handleCopy('title', publishingInfo.title)}
              className="px-3 py-2 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg hover:bg-[#1e1e24] transition-all"
              data-testid="copy-title"
            >
              {copiedField === 'title' ? (
                <Check className="w-4 h-4 text-[#10b981]" />
              ) : (
                <Copy className="w-4 h-4 text-[#8b8b99]" />
              )}
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Description</label>
          <div className="flex gap-2">
            <textarea
              value={publishingInfo.description}
              readOnly
              rows={2}
              className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2 text-[#f8f8f8] resize-none"
            />
            <button
              onClick={() => handleCopy('description', publishingInfo.description)}
              className="px-3 py-2 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg hover:bg-[#1e1e24] transition-all self-start"
              data-testid="copy-description"
            >
              {copiedField === 'description' ? (
                <Check className="w-4 h-4 text-[#10b981]" />
              ) : (
                <Copy className="w-4 h-4 text-[#8b8b99]" />
              )}
            </button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Tags</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={publishingInfo.tags}
              readOnly
              className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2 text-[#f8f8f8]"
            />
            <button
              onClick={() => handleCopy('tags', publishingInfo.tags)}
              className="px-3 py-2 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg hover:bg-[#1e1e24] transition-all"
              data-testid="copy-tags"
            >
              {copiedField === 'tags' ? (
                <Check className="w-4 h-4 text-[#10b981]" />
              ) : (
                <Copy className="w-4 h-4 text-[#8b8b99]" />
              )}
            </button>
          </div>
        </div>

        {/* Copy All */}
        <button
          onClick={() => handleCopy('all', `${publishingInfo.title}\n\n${publishingInfo.description}\n\n${publishingInfo.tags}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all"
          data-testid="copy-all"
        >
          {copiedField === 'all' ? (
            <>
              <Check className="w-4 h-4 text-[#10b981]" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy All
            </>
          )}
        </button>
      </div>

      {/* Project Summary */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Project Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Film className="w-6 h-6 text-[#e94560] mx-auto mb-2" />
            <p className="text-sm text-[#8b8b99]">Song</p>
            <p className="text-[#f8f8f8] font-medium truncate">{project.title || 'Untitled'}</p>
          </div>
          <div className="text-center">
            <span className="text-2xl block mb-2">{project.template?.emoji || '🎬'}</span>
            <p className="text-sm text-[#8b8b99]">Template</p>
            <p className="text-[#f8f8f8] font-medium truncate">{project.template?.name || 'Custom'}</p>
          </div>
          <div className="text-center">
            <Smartphone className="w-6 h-6 text-[#e94560] mx-auto mb-2" />
            <p className="text-sm text-[#8b8b99]">Duration</p>
            <p className="text-[#f8f8f8] font-medium">{totalDuration.toFixed(1)}s</p>
          </div>
          <div className="text-center">
            <span className="text-2xl block mb-2">💰</span>
            <p className="text-sm text-[#8b8b99]">Total Cost</p>
            <p className="text-[#e94560] font-heading font-semibold">${totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Create Another */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onCreateAnother}
          className="flex items-center gap-2 px-6 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all"
          data-testid="create-another"
        >
          Create Another Video
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
