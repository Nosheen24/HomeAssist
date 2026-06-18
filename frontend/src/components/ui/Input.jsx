export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-[13px] font-medium text-ha-text-2">{label}</label>
      )}
      <input
        className={`block w-full rounded-[6px] border px-3 py-2.5 text-sm text-ha-text-1 bg-ha-bg placeholder-ha-text-3 transition-colors duration-200 focus:outline-none focus:ring-2 focus:border-transparent ${
          error
            ? 'border-ha-danger focus:ring-ha-danger/30'
            : 'border-ha-border focus:border-ha-primary focus:ring-ha-primary/20'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-ha-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-ha-text-3">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-[13px] font-medium text-ha-text-2">{label}</label>
      )}
      <select
        className={`block w-full rounded-[6px] border border-ha-border px-3 py-2.5 text-sm text-ha-text-1 bg-ha-bg focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors duration-200 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-ha-danger">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-[13px] font-medium text-ha-text-2">{label}</label>
      )}
      <textarea
        className={`block w-full rounded-[6px] border px-3 py-2.5 text-sm text-ha-text-1 bg-ha-bg placeholder-ha-text-3 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-200 ${
          error ? 'border-ha-danger focus:ring-ha-danger/30' : 'border-ha-border focus:border-ha-primary focus:ring-ha-primary/20'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-ha-danger">{error}</p>}
    </div>
  );
}
