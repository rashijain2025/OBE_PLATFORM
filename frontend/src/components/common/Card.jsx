/**
 * Card — general-purpose card wrapper with consistent styling.
 *
 * @param {string}  className - Additional CSS classes
 * @param {boolean} noPadding - If true, removes default padding (useful for tables)
 * @param {React.ReactNode} children
 */
export default function Card({ children, className = '', noPadding = false }) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-surface-border
        shadow-sm
        ${noPadding ? '' : 'p-5 lg:p-6'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
