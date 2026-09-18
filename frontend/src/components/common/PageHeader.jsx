/**
 * PageHeader — page-level title with optional description and action button.
 *
 * @param {string}          title       - Page title
 * @param {string}          description - Subtitle / description
 * @param {React.ReactNode} action      - Optional right-aligned action (e.g., button)
 */
export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
