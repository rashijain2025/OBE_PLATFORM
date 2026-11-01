import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStatsApi } from '../api/admin';
import { Users, Building2, BookOpen, Award, GraduationCap, Activity, LayoutDashboard, AlertCircle, CheckSquare, Layers, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '../components/ui/AdminUI';

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-5 flex items-start gap-4">
      <div className="rounded-lg p-2.5 bg-accent-soft text-accent">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">{label}</div>
        <div className="text-2xl font-bold text-ink tabular-nums">{value ?? '—'}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardStatsApi()
      .then((res) => setStats(res.data?.stats))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  const roleDescriptions = {
    admin: 'Full system access — manage users, departments, programmes, and courses.',
    coordinator: 'OBE Coordinator — manage curriculum, PO/PSO definitions, and college-wide attainment.',
    faculty: 'Course Instructor — manage course outcomes, assessments, marks entry, and CO attainment.',
  };

  const renderStats = () => {
    if (loading) return <Spinner />;
    if (error) return (
      <div className="flex items-center gap-2 text-status-below text-sm bg-status-below-soft border border-red-200 rounded-lg px-4 py-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Could not load stats: {error}</span>
      </div>
    );
    if (!stats) return null;

    if (user?.role === 'admin') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.users?.total} sub={`${stats.users?.byRole?.faculty} faculty · ${stats.users?.byRole?.student} student records`} icon={Users} />
          <StatCard label="Departments" value={stats.departments} icon={Building2} />
          <StatCard label="Programmes" value={stats.programmes} icon={Award} />
          <StatCard label="Courses" value={stats.courses} icon={BookOpen} />
          <StatCard label="Active Enrollments" value={stats.enrollments} icon={GraduationCap} />
          <StatCard label="Admins" value={stats.users?.byRole?.admin} icon={Activity} sub="System admins" />
        </div>
      );
    }

    if (user?.role === 'coordinator') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Courses" value={stats.courses} icon={BookOpen} sub="In department" />
          <StatCard label="Programmes" value={stats.programmes} icon={Building2} sub="Academic programmes" />
          <StatCard label="Program Outcomes (POs)" value={stats.pos} icon={Award} sub="Graduate attributes" />
          <StatCard label="Program Specific (PSOs)" value={stats.psos} icon={Award} sub="Domain outcomes" />
          <StatCard label="Educational Objectives" value={stats.peos} icon={BookOpen} sub="PEO statements" />
          <StatCard label="CO-PO Mappings" value={stats.mappings} icon={Activity} sub="Correlation matrix" />
          <StatCard label="Active Enrollments" value={stats.enrollments} icon={GraduationCap} sub="Student seats" />
          <StatCard label="Total Students" value={stats.students} icon={Users} sub="Department cohort" />
        </div>
      );
    }

    if (user?.role === 'faculty') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="My Courses" value={stats.myCourses} icon={BookOpen} sub="Assigned courses" />
          <StatCard label="Enrolled Students" value={stats.myStudents} icon={Users} sub="Active enrollments" />
          <StatCard label="Course Outcomes" value={stats.myCOs} icon={Award} sub="CO definitions" />
          <StatCard label="Assessments" value={stats.myAssessments} icon={CheckSquare} sub="Exams & tests" />
          <StatCard label="Questions" value={stats.myQuestions} icon={Activity} sub="CO mapped items" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent-soft text-accent text-xs font-semibold uppercase tracking-wider mb-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{user?.role} dashboard</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-ink font-serif">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-muted text-sm mt-1 max-w-2xl">
              {roleDescriptions[user?.role]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/health"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-paper text-ink text-sm font-medium border border-border transition-colors"
            >
              <Activity className="w-4 h-4 text-status-attained" />
              <span>System Health</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div>
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Live Stats</h3>
        {renderStats()}
      </div>

      {/* Programme Outcomes & Accreditation Workflow */}
      {(user?.role === 'coordinator' || user?.role === 'admin') && (
        <div className="rounded-2xl border border-border bg-surface shadow-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Programme Outcomes & Accreditation Workflow
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/outcomes"
              className="p-4 rounded-xl bg-paper border border-border hover:border-accent/50 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="font-bold text-ink text-sm group-hover:text-accent">PEO / PO / PSO Framework</h4>
                <p className="text-xs text-muted mt-1">Manage official graduate attributes and statements</p>
              </div>
              <Award className="w-5 h-5 text-accent shrink-0" />
            </Link>

            <Link
              to="/mappings"
              className="p-4 rounded-xl bg-paper border border-border hover:border-accent/50 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="font-bold text-ink text-sm group-hover:text-accent">CO-PO Mapping Matrix</h4>
                <p className="text-xs text-muted mt-1">Correlate course outcomes with strength 1/2/3</p>
              </div>
              <Layers className="w-5 h-5 text-accent shrink-0" />
            </Link>

            <Link
              to="/programme-report"
              className="p-4 rounded-xl bg-paper border border-border hover:border-accent/50 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="font-bold text-ink text-sm group-hover:text-accent">Programme Attainment Report</h4>
                <p className="text-xs text-muted mt-1">PO/PSO attainment, radar charts & CSV export</p>
              </div>
              <BarChart3 className="w-5 h-5 text-accent shrink-0" />
            </Link>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6">
        <h3 className="text-base font-semibold text-ink mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <span>Active Session</span>
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted uppercase">Name</dt>
            <dd className="text-ink font-medium mt-0.5">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted uppercase">Email</dt>
            <dd className="text-ink font-medium mt-0.5">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted uppercase">System ID</dt>
            <dd className="text-muted font-mono text-xs mt-0.5">{user?._id}</dd>
          </div>
          {user?.rollNo && (
            <div>
              <dt className="text-xs font-medium text-muted uppercase">Roll Number</dt>
              <dd className="text-accent font-medium mt-0.5">{user.rollNo}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-muted uppercase">Department</dt>
            <dd className="text-ink font-medium mt-0.5">{user?.department?.name || user?.department?.code || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted uppercase">Status</dt>
            <dd className="text-status-attained font-medium mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-attained" />
              <span>Active</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
