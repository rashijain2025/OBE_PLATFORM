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
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
    coordinator: 'bg-blue-50 text-blue-700 border-blue-200',
    faculty: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface/95 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center font-bold text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink leading-tight font-serif">OBE Platform</h1>
            <p className="text-xs text-muted hidden sm:block">Outcome-Based Education System</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-ink flex items-center gap-2 justify-end">
              <span>{user?.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                  roleBadgeStyles[user?.role] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-muted">
              {user?.rollNo ? `Roll: ${user.rollNo} · ` : ''}
              {user?.department?.code ? `Dept: ${user.department.code} · ` : ''}
              {user?.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-red-50 text-muted hover:text-red-600 border border-border hover:border-red-200 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav — dark navy gradient per spec */}
        <aside className="w-full md:w-64 border-b md:border-b-0 bg-gradient-to-b from-ink to-ink-dark p-4 shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 px-3">
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
                        ? 'bg-white/10 text-white border-l-2 border-accent'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
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

        {/* Page Content & Footer */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-border bg-surface/50 py-4 px-6 text-center text-xs text-muted">
            <div className="space-y-1">
              <p className="text-muted/80">
                &copy; 2026 MITS Gwalior Outcome Based Education Platform
              </p>
              <p className="text-muted">
                Made by{' '}
                <span className="font-semibold text-[#7B112B]">Rashi Jain</span>
                {' '}&amp;{' '}
                <span className="font-semibold text-[#7B112B]">Shashank Nigam</span>
                {' '}under{' '}
                <span className="font-semibold text-[#7B112B]">Neha Bhardwaj</span>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
