import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Video, Settings, Plus, Film, Calendar, DollarSign, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalVideos: 0, monthCost: 0, weekVideos: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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
              <Link
                key={project._id}
                to={`/project/${project._id}`}
                className="bg-[#141418] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-[#e94560]/50 transition-all cursor-pointer block"
                data-testid={`project-card-${project._id}`}
              >
                {/* Thumbnail Placeholder */}
                <div className="aspect-video bg-[#0c0c0f] flex items-center justify-center">
                  <Film className="w-10 h-10 text-[#2a2a35]" strokeWidth={1} />
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
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
