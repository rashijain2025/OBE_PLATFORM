import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Target,
  FileBarChart,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'My Courses', icon: BookOpen },
  { to: '/assessments', label: 'Assessments', icon: ClipboardList },
  { to: '/attainment', label: 'CO Attainment', icon: Target },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={`
        hidden lg:flex flex-col
        bg-sidebar text-white
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}
        min-h-screen sticky top-0
      `}
    >
      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600 shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
            OBE Platform
          </span>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
              ${
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
              }
              ${collapsed ? 'justify-center' : ''}
              `
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Collapse Toggle ────────────────────────────────────────── */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-slate-400 hover:bg-sidebar-hover hover:text-white transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
