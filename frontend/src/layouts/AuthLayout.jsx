import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

/**
 * AuthLayout — centered card layout for login/register pages.
 * If the user is already authenticated, redirects to /dashboard.
 */
export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100 flex">
      {/* ── Left Branding Panel (visible on large screens) ─────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mx-auto mb-8">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            OBE Platform
          </h1>
          <p className="text-lg text-primary-200 leading-relaxed">
            AI-Powered Outcome Based Education — manage courses, assessments,
            CO-PO mapping, and attainment analysis in one unified platform.
          </p>
        </div>
      </div>

      {/* ── Right Form Area ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">OBE Platform</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
