import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, formatApiErrorDetail } from '../contexts/AuthContext';
import { Video, Mail, Lock, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center p-4 auth-glow">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Video className="w-10 h-10 text-[#e94560]" strokeWidth={1.5} />
          <h1 className="font-heading text-2xl font-bold text-[#f8f8f8]">
            Music Video Factory
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6" data-testid="login-card">
          <h2 className="font-heading text-xl font-semibold text-[#f8f8f8] mb-6 text-center">
            Welcome back
          </h2>

          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg mb-4 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} data-testid="login-form">
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm text-[#8b8b99] mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8b99]" strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg pl-10 pr-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all"
                    placeholder="you@example.com"
                    required
                    data-testid="login-email-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm text-[#8b8b99] mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8b99]" strokeWidth={1.5} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg pl-10 pr-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all"
                    placeholder="••••••••"
                    required
                    data-testid="login-password-input"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e94560] text-white font-medium py-3 rounded-lg hover:bg-[#f25a74] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="login-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-[#8b8b99] text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#e94560] hover:text-[#f25a74] transition-colors" data-testid="register-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
