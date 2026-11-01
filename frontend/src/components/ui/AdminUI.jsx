/**
 * Shared UI primitives for Admin pages
 */

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-ink font-serif">{title}</h2>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, type = 'button', disabled = false, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink hover:bg-ink-dark text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-below-soft hover:bg-red-100 text-status-below border border-red-200 text-xs font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-paper text-muted hover:text-ink border border-border text-xs font-medium transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-64 px-3 py-2 rounded-lg bg-surface border border-border text-ink placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
    />
  );
}

export function FormInput({ label, id, error, ...props }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2 rounded-lg bg-surface border text-ink placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors ${
          error ? 'border-status-below' : 'border-border focus:border-accent'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-status-below">{error}</p>}
    </div>
  );
}

export function FormSelect({ label, id, error, options, children, ...props }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-muted mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-3 py-2 rounded-lg bg-surface border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors ${
          error ? 'border-status-below' : 'border-border focus:border-accent'
        }`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="mt-1 text-xs text-status-below">{error}</p>}
    </div>
  );
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-6">
        <h3 className="text-lg font-bold text-ink font-serif mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );
}

export function EmptyState({ message = 'No items found' }) {
  return (
    <div className="text-center py-16 text-muted text-sm">{message}</div>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
    coordinator: 'bg-blue-50 text-blue-700 border-blue-200',
    faculty: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    student: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}

export function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs text-status-attained">
      <span className="w-1.5 h-1.5 rounded-full bg-status-attained" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-status-below">
      <span className="w-1.5 h-1.5 rounded-full bg-status-below" />
      Inactive
    </span>
  );
}
