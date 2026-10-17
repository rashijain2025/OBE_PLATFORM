import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Users,
  CheckSquare,
  Activity,
  LogOut,
  Building2,
  GraduationCap,
  FileSpreadsheet,
  Shield,
  UserCheck,
  BarChart3,
  Layers,
  Brain,
  Sparkles,
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define nav items configured per role
  const getNavLinks = (role) => {
    const common = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    switch (role) {
      case 'admin':
        return [
          ...common,
          { to: '/users', label: 'User Directory', icon: Users },
          { to: '/departments', label: 'Departments & Progs', icon: Building2 },
          { to: '/courses', label: 'Courses', icon: BookOpen },
          { to: '/outcomes', label: 'PEO / PO / PSO', icon: Award },
          { to: '/mappings', label: 'CO-PO Mapping', icon: Layers },
          { to: '/programme-report', label: 'Programme Report', icon: BarChart3 },
          { to: '/early-warning', label: 'Early Warning', icon: Sparkles },
          { to: '/model', label: 'ML Model Ops', icon: Brain },
          { to: '/enrollments', label: 'Enrollments', icon: UserCheck },
          { to: '/health', label: 'System Health', icon: Activity },
        ];
      case 'coordinator':
        return [
          ...common,
          { to: '/courses', label: 'Courses', icon: BookOpen },
          { to: '/departments', label: 'Departments & Progs', icon: Building2 },
          { to: '/outcomes', label: 'PEO / PO / PSO', icon: Award },
          { to: '/mappings', label: 'CO-PO Mapping', icon: Layers },
          { to: '/marks', label: 'Marks Entry & Review', icon: FileSpreadsheet },
          { to: '/attainment', label: 'CO Attainment', icon: Award },
          { to: '/programme-report', label: 'Programme Report', icon: BarChart3 },
          { to: '/reports', label: 'Faculty Reports', icon: BarChart3 },
          { to: '/early-warning', label: 'Early Warning', icon: Sparkles },
          { to: '/enrollments', label: 'Enrollments', icon: UserCheck },
          { to: '/health', label: 'System Health', icon: Activity },
        ];
      case 'faculty':
        return [
          ...common,
          { to: '/courses', label: 'My Courses', icon: BookOpen },
          { to: '/marks', label: 'Marks Entry', icon: FileSpreadsheet },
          { to: '/attainment', label: 'CO Attainment', icon: Award },
          { to: '/early-warning', label: 'Early Warning', icon: Sparkles },
          { to: '/reports', label: 'Faculty Reports', icon: BarChart3 },
          { to: '/health', label: 'System Health', icon: Activity },
        ];
      default:
        return common;
    }
  };

  const navLinks = getNavLinks(user?.role);

  const roleBadgeStyles = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    coordinator: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    faculty: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">OBE Platform</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Outcome-Based Education System</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-white flex items-center gap-2 justify-end">
              <span>{user?.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                  roleBadgeStyles[user?.role] || 'bg-gray-800 text-gray-300'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {user?.rollNo ? `Roll: ${user.rollNo} · ` : ''}
              {user?.department?.code ? `Dept: ${user.department.code} · ` : ''}
              {user?.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-red-950/40 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-800/40 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-800 bg-gray-900/40 p-4 shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-3">
            Navigation ({user?.role})
          </div>
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
