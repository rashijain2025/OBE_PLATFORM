import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import {
  BookOpen,
  ClipboardList,
  Target,
  FileBarChart,
} from 'lucide-react';

const actions = [
  {
    label: 'View Courses',
    description: 'See your assigned courses',
    icon: BookOpen,
    to: '/courses',
    color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
  },
  {
    label: 'Assessments',
    description: 'Manage your assessments',
    icon: ClipboardList,
    to: '/assessments',
    color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  },
  {
    label: 'CO Attainment',
    description: 'View attainment analysis',
    icon: Target,
    to: '/attainment',
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
  },
  {
    label: 'Reports',
    description: 'Generate OBE reports',
    icon: FileBarChart,
    to: '/reports',
    color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
  },
];

/**
 * QuickActions — grid of shortcut buttons to key OBE sections.
 */
export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map(({ label, description, icon: Icon, to, color }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="group flex items-center gap-3 p-4 rounded-xl border border-surface-border hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer"
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
