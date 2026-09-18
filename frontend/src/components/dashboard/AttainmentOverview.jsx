import Card from '../common/Card';
import EmptyState from '../common/EmptyState';
import { Target } from 'lucide-react';

/**
 * AttainmentOverview — displays CO attainment bars or empty state.
 *
 * @param {Array} attainmentData - Array of { coCode, coName, attainment, target } objects
 */
export default function AttainmentOverview({ attainmentData = [] }) {
  if (attainmentData.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          CO Attainment Overview
        </h2>
        <EmptyState
          icon={Target}
          title="No attainment data"
          message="CO attainment will be calculated once you define Course Outcomes and enter assessment marks."
        />
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        CO Attainment Overview
      </h2>
      <div className="space-y-4">
        {attainmentData.map((item, index) => {
          const percentage = Math.min(item.attainment, 100);
          const isAboveTarget = item.attainment >= item.target;

          return (
            <div key={item.coCode || index}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700">
                  {item.coCode}
                </span>
                <span className="text-sm text-slate-500">
                  {item.attainment}%{' '}
                  <span className="text-xs text-slate-400">
                    / {item.target}% target
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    isAboveTarget ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
