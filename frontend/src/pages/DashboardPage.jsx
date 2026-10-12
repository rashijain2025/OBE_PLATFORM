import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStatsApi } from '../api/admin';
import { Users, Building2, BookOpen, Award, GraduationCap, Activity, LayoutDashboard, AlertCircle, CheckSquare, Layers, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '../components/ui/AdminUI';

function StatCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 border ${colorMap[color]}`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</div>
        <div className={`text-2xl font-bold text-${color}-400`}>{value ?? '—'}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
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
      <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Could not load stats: {error}</span>
      </div>
    );
    if (!stats) return null;

    if (user?.role === 'admin') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.users?.total} sub={`${stats.users?.byRole?.faculty} faculty · ${stats.users?.byRole?.student} student records`} icon={Users} color="purple" />
          <StatCard label="Departments" value={stats.departments} icon={Building2} color="blue" />
          <StatCard label="Programmes" value={stats.programmes} icon={Award} color="indigo" />
          <StatCard label="Courses" value={stats.courses} icon={BookOpen} color="emerald" />
          <StatCard label="Active Enrollments" value={stats.enrollments} icon={GraduationCap} color="amber" />
          <StatCard label="Admins" value={stats.users?.byRole?.admin} icon={Activity} color="rose" sub="System admins" />
        </div>
      );
    }

    if (user?.role === 'coordinator') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Courses" value={stats.courses} icon={BookOpen} color="indigo" sub="In department" />
          <StatCard label="Programmes" value={stats.programmes} icon={Building2} color="blue" sub="Academic programmes" />
          <StatCard label="Program Outcomes (POs)" value={stats.pos} icon={Award} color="purple" sub="Graduate attributes" />
          <StatCard label="Program Specific (PSOs)" value={stats.psos} icon={Award} color="emerald" sub="Domain outcomes" />
          <StatCard label="Educational Objectives" value={stats.peos} icon={BookOpen} color="amber" sub="PEO statements" />
          <StatCard label="CO-PO Mappings" value={stats.mappings} icon={Activity} color="rose" sub="Correlation matrix" />
          <StatCard label="Active Enrollments" value={stats.enrollments} icon={GraduationCap} color="emerald" sub="Student seats" />
          <StatCard label="Total Students" value={stats.students} icon={Users} color="indigo" sub="Department cohort" />
        </div>
      );
    }

    if (user?.role === 'faculty') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="My Courses" value={stats.myCourses} icon={BookOpen} color="emerald" sub="Assigned courses" />
          <StatCard label="Enrolled Students" value={stats.myStudents} icon={Users} color="indigo" sub="Active enrollments" />
          <StatCard label="Course Outcomes" value={stats.myCOs} icon={Award} color="purple" sub="CO definitions" />
          <StatCard label="Assessments" value={stats.myAssessments} icon={CheckSquare} color="blue" sub="Exams & tests" />
          <StatCard label="Questions" value={stats.myQuestions} icon={Activity} color="amber" sub="CO mapped items" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{user?.role} dashboard</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">
              {roleDescriptions[user?.role]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/health"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium border border-gray-700 transition-colors"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>System Health</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Stats</h3>
        {renderStats()}
      </div>

      {/* Programme Outcomes & Accreditation Workflow */}
      {(user?.role === 'coordinator' || user?.role === 'admin') && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Programme Outcomes & Accreditation Workflow
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/outcomes"
              className="p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800/40 transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="font-bold text-white text-sm group-hover:text-indigo-400">PEO / PO / PSO Framework</h4>
                <p className="text-xs text-gray-400 mt-1">Manage official graduate attributes and statements</p>
              </div>
              <Award className="w-5 h-5 text-indigo-400 shrink-0" />
            </Link>

            <Link
              to="/mappings"
              className="p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800/40 transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="font-bold text-white text-sm group-hover:text-indigo-400">CO-PO Mapping Matrix</h4>
                <p className="text-xs text-gray-400 mt-1">Correlate course outcomes with strength 1/2/3</p>
              </div>
              <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
            </Link>

            <Link
              to="/programme-report"
              className="p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800/40 transition-all flex items-center justify-between group"
            >
              <div>
                <h4 className="font-bold text-white text-sm group-hover:text-indigo-400">Programme Attainment Report</h4>
                <p className="text-xs text-gray-400 mt-1">PO/PSO attainment, radar charts & CSV export</p>
              </div>
              <BarChart3 className="w-5 h-5 text-indigo-400 shrink-0" />
            </Link>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span>Active Session</span>
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase">Name</dt>
            <dd className="text-white font-medium mt-0.5">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase">Email</dt>
            <dd className="text-white font-medium mt-0.5">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase">System ID</dt>
            <dd className="text-gray-400 font-mono text-xs mt-0.5">{user?._id}</dd>
          </div>
          {user?.rollNo && (
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase">Roll Number</dt>
              <dd className="text-amber-400 font-medium mt-0.5">{user.rollNo}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase">Department</dt>
            <dd className="text-white font-medium mt-0.5">{user?.department?.name || user?.department?.code || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase">Status</dt>
            <dd className="text-emerald-400 font-medium mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Active</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
