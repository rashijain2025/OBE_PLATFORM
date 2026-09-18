import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentAssessments from '../components/dashboard/RecentAssessments';
import AttainmentOverview from '../components/dashboard/AttainmentOverview';
import QuickActions from '../components/dashboard/QuickActions';
import { AlertCircle } from 'lucide-react';

/**
 * Dashboard — Faculty Dashboard page.
 * Fetches real data from GET /api/dashboard/faculty.
 * Displays summary stats, recent assessments, CO attainment, and quick actions.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/api/dashboard/faculty');
        setDashboardData(response.data.data);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          'Failed to load dashboard data. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Loading your dashboard..."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-surface-border shadow-sm p-5 h-28 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-20" />
                  <div className="h-6 bg-slate-100 rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading dashboard</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, recentAssessments, attainmentOverview } = dashboardData;

  // Build greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'Faculty'}!`}
        description="Here's an overview of your OBE activity."
      />

      {/* ── Stats Grid ─────────────────────────────────────────────── */}
      <StatsGrid summary={summary} />

      {/* ── Two-column Section ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAssessments assessments={recentAssessments} />
        <AttainmentOverview attainmentData={attainmentOverview} />
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <QuickActions />
    </div>
  );
}
