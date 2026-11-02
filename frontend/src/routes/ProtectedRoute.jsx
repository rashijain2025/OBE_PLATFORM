import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3">
        <Loader className="w-8 h-8 text-accent animate-spin" />
        <p className="text-muted text-sm">Validating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = user?.roles && user.roles.length > 0 ? user.roles : [user?.role];
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.some((r) => userRoles.includes(r))) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-status-below-soft border border-red-200 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-status-below" />
        </div>
        <h2 className="text-2xl font-bold text-ink font-serif mb-2">Access Forbidden (403)</h2>
        <p className="text-muted max-w-md mb-6">
          Your account role (<span className="text-status-below font-semibold">{user.role}</span>) does
          not have permission to view this section.
        </p>
        <a
          href="/dashboard"
          className="px-5 py-2.5 rounded-lg bg-ink hover:bg-ink-dark text-white font-medium text-sm transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return children;
}
