export default function Card({ children, className = '', noPadding = false }) {
  return (
    <div
      className={`bg-ha-surface rounded-xl border border-ha-border shadow-card overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`}
    >
      {children}
    </div>
  );
}
