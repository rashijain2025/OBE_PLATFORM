import StatsCard from '../common/StatsCard';
import {
  BookOpen,
  GraduationCap,
  Target,
  ClipboardList,
} from 'lucide-react';

/**
 * StatsGrid — displays faculty dashboard summary metrics.
 *
 * @param {Object} summary - Dashboard summary data from API
 * @param {number} summary.totalCourses
 * @param {number} summary.activeCourses
 * @param {number} summary.totalCourseOutcomes
 * @param {number} summary.activeAssessments
 * @param {number|null} summary.averageCOAttainment
 */
export default function StatsGrid({ summary }) {
  const stats = [
    {
      label: 'Total Courses',
      value: summary.totalCourses,
      subtitle: `${summary.activeCourses} active`,
      icon: BookOpen,
      iconColor: 'bg-blue-50',
      iconTextColor: 'text-blue-600',
    },
    {
      label: 'Course Outcomes',
      value: summary.totalCourseOutcomes,
      subtitle: 'Defined COs',
      icon: GraduationCap,
      iconColor: 'bg-emerald-50',
      iconTextColor: 'text-emerald-600',
    },
    {
      label: 'Active Assessments',
      value: summary.activeAssessments,
      subtitle: 'In progress',
      icon: ClipboardList,
      iconColor: 'bg-amber-50',
      iconTextColor: 'text-amber-600',
    },
    {
      label: 'Avg CO Attainment',
      value: summary.averageCOAttainment !== null
        ? `${summary.averageCOAttainment}%`
        : '—',
      subtitle: summary.averageCOAttainment !== null
        ? 'Across all courses'
        : 'Not yet calculated',
      icon: Target,
      iconColor: 'bg-violet-50',
      iconTextColor: 'text-violet-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatsCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
