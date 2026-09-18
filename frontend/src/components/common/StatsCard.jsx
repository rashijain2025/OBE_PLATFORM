/**
 * StatsCard — displays a single metric with icon, label, value, and subtitle.
 *
 * @param {string}          label     - Metric label (e.g., "Total Courses")
 * @param {string|number}   value     - Metric value (e.g., "12" or 0)
 * @param {string}          subtitle  - Supporting text below the value
 * @param {React.Component} icon      - Lucide icon component
 * @param {string}          iconColor - Tailwind bg class for icon container (e.g., "bg-blue-50")
 * @param {string}          iconTextColor - Tailwind text class for icon (e.g., "text-blue-600")
 */
export default function StatsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'bg-primary-50',
  iconTextColor = 'text-primary-600',
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-sm p-5 flex items-start gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconColor} shrink-0`}>
        <Icon className={`w-6 h-6 ${iconTextColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-none">
          {value ?? '—'}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
