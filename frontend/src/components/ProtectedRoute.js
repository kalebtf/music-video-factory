import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e94560] animate-spin" />
      </div>
    );
  }

  if (user === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
