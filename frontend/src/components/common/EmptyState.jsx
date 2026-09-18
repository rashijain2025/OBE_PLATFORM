import { Inbox } from 'lucide-react';

/**
 * EmptyState — placeholder for sections with no data yet.
 *
 * @param {React.Component} icon    - Lucide icon component (defaults to Inbox)
 * @param {string}          title   - Heading text
 * @param {string}          message - Descriptive text
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data yet',
  message = 'This section will be populated as you add data.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
    </div>
  );
}
