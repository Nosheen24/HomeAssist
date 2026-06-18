export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-[4px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ha-bg disabled:opacity-50 disabled:cursor-not-allowed tracking-wide active:scale-[0.98]';

  const variants = {
    primary:   'bg-ha-primary hover:bg-ha-primary-hover text-white shadow-sm hover:shadow-md focus:ring-ha-primary',
    secondary: 'border border-ha-border-2 text-ha-text-2 hover:border-ha-primary hover:text-ha-primary focus:ring-ha-primary bg-white',
    danger:    'bg-red-50 border border-ha-danger text-ha-danger hover:bg-red-100 focus:ring-ha-danger',
    ghost:     'text-ha-text-2 hover:bg-ha-surface-2 focus:ring-ha-border-2',
    success:   'bg-teal-50 border border-ha-teal text-ha-teal hover:bg-teal-100 focus:ring-ha-teal',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-sm gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
