import Card from '../common/Card';
import EmptyState from '../common/EmptyState';
import { ClipboardList } from 'lucide-react';

/**
 * RecentAssessments — shows recent assessments table or empty state.
 *
 * @param {Array} assessments - Array of recent assessment objects from API
 */
export default function RecentAssessments({ assessments = [] }) {
  if (assessments.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Recent Assessments
        </h2>
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          message="Your recent assessments will appear here once you create them in the Assessments module."
        />
      </Card>
    );
  }

  return (
    <Card noPadding>
      <div className="p-5 pb-3 lg:p-6 lg:pb-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Recent Assessments
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-surface-border">
              <th className="text-left font-medium text-slate-500 px-5 lg:px-6 py-3">Course</th>
              <th className="text-left font-medium text-slate-500 px-3 py-3">Type</th>
              <th className="text-left font-medium text-slate-500 px-3 py-3">Date</th>
              <th className="text-left font-medium text-slate-500 px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((assessment, index) => (
              <tr
                key={assessment._id || index}
                className="border-t border-surface-border hover:bg-slate-50 transition-colors"
              >
                <td className="px-5 lg:px-6 py-3 font-medium text-slate-700">
                  {assessment.courseName}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {assessment.type}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {assessment.date}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${
                      assessment.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : assessment.status === 'active'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {assessment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
