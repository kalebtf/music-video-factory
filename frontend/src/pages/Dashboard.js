import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Video, Settings, Plus, Film, Calendar, DollarSign, Loader2, Trash2, Play, Edit3, X } from 'lucide-react';
import { AuthImage, AuthVideo } from '../components/AuthImage';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalVideos: 0, monthCost: 0, weekVideos: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // {id, title}
  const [videoPreview, setVideoPreview] = useState(null); // project id for video modal

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, projectsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/projects')
      ]);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    setDeleting(projectId);
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p._id !== projectId));
    } catch (err) {
      alert('Failed to delete project');
      console.error(err);
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-[#8b8b99]/20 text-[#8b8b99]',
      processing: 'bg-[#f59e0b]/20 text-[#f59e0b]',
      images: 'bg-[#00b4d8]/20 text-[#00b4d8]',
      animation: 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
      assembly: 'bg-[#f59e0b]/20 text-[#f59e0b]',
      done: 'bg-[#10b981]/20 text-[#10b981]'
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-[#2a2a35] px-6 py-4" data-testid="dashboard-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-[#e94560]" strokeWidth={1.5} />
            <h1 className="font-heading text-xl font-bold text-[#f8f8f8]">
              Music Video Factory
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/settings"
              className="p-2 text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all"
              data-testid="settings-link"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-[#8b8b99] hover:text-[#f8f8f8] transition-colors"
              data-testid="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Stats Bar */}
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4 mb-6" data-testid="stats-bar">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#8b8b99]" strokeWidth={1.5} />
              <span className="text-[#8b8b99]">Videos:</span>
              <span className="font-heading font-semibold text-[#e94560]" data-testid="stat-total-videos">
                {stats.totalVideos}
              </span>
            </div>
            <div className="w-px h-4 bg-[#2a2a35] hidden md:block" />
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#8b8b99]" strokeWidth={1.5} />
              <span className="text-[#8b8b99]">This month:</span>
              <span className="font-heading font-semibold text-[#e94560]" data-testid="stat-month-cost">
                ${stats.monthCost.toFixed(2)}
              </span>
            </div>
            <div className="w-px h-4 bg-[#2a2a35] hidden md:block" />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8b8b99]" strokeWidth={1.5} />
              <span className="text-[#8b8b99]">This week:</span>
              <span className="font-heading font-semibold text-[#e94560]" data-testid="stat-week-videos">
                {stats.weekVideos}
              </span>
            </div>
          </div>
        </div>

        {/* New Video Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-heading text-lg font-semibold text-[#f8f8f8]">Your Projects</h2>
          <Link
            to="/new"
            className="bg-[#e94560] text-white font-medium px-4 py-2 rounded-lg hover:bg-[#f25a74] transition-all flex items-center gap-2"
            data-testid="new-video-button"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            New Video
          </Link>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#e94560] animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div
            className="min-h-[300px] border-2 border-dashed border-[#2a2a35] rounded-xl flex flex-col items-center justify-center text-[#8b8b99]"
            data-testid="empty-state"
          >
            <Film className="w-12 h-12 mb-4" strokeWidth={1} />
            <p className="text-lg mb-2">No videos yet</p>
            <p className="text-sm">Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
            {projects.map((project) => (
              <div
                key={project._id}
                className="bg-[#141418] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-[#e94560]/50 transition-all"
                data-testid={`project-card-${project._id}`}
              >
                {/* Thumbnail - show first image if available */}
                <div className="aspect-video bg-[#0c0c0f] flex items-center justify-center relative group">
                  {project.images && project.images.length > 0 && project.images.find(img => img.url) ? (
                    <AuthImage 
                      src={project.images.find(img => img.url).url} 
                      alt={project.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : project.images && project.images.length > 0 ? (
                    <div className="w-full h-full bg-gradient-to-br from-[#e94560]/30 to-[#0f3460]/30 flex items-center justify-center">
                      <Film className="w-10 h-10 text-[#e94560]/50" strokeWidth={1} />
                    </div>
                  ) : (
                    <Film className="w-10 h-10 text-[#2a2a35]" strokeWidth={1} />
                  )}
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    {project.finalVideoPath && (
                      <button
                        onClick={() => setVideoPreview(project._id)}
                        className="bg-[#e94560] text-white p-3 rounded-full hover:bg-[#f25a74] transition-all"
                        title="Play video"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    )}
                    <Link
                      to={`/project/${project._id}`}
                      className="bg-[#2a2a35] text-white p-3 rounded-full hover:bg-[#3a3a45] transition-all"
                      title="Edit project"
                    >
                      <Edit3 className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteConfirm({ id: project._id, title: project.title }); }}
                      className="bg-[#2a2a35] text-red-400 p-3 rounded-full hover:bg-red-500/20 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-heading font-semibold text-[#f8f8f8] truncate pr-2">
                      {project.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-md whitespace-nowrap ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#8b8b99]">
                    <span>{formatDate(project.createdAt)}</span>
                    <span className="text-[#e94560]">${(project.totalCost || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-heading text-lg font-bold text-[#f8f8f8] mb-2">Delete Project</h3>
            <p className="text-[#8b8b99] mb-6">
              Are you sure you want to delete <span className="text-[#f8f8f8] font-medium">"{deleteConfirm.title}"</span>? 
              This will remove all images, clips, and the final video. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#3a3a45] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleting === deleteConfirm.id}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting === deleteConfirm.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {videoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setVideoPreview(null)}>
          <div className="relative max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setVideoPreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-[#e94560] transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
              <AuthVideo
                src={`/api/projects/${videoPreview}/final/video.mp4`}
                className="w-full h-full object-contain"
                controls
                autoPlay
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
