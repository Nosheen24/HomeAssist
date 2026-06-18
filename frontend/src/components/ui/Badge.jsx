const variants = {
  default:  'bg-ha-surface-2 text-ha-text-2',
  primary:  'bg-ha-primary/15 text-ha-primary',
  amber:    'bg-ha-accent/15 text-ha-accent',
  teal:     'bg-ha-teal/15 text-ha-teal',
  danger:   'bg-ha-danger/15 text-ha-danger',
  indigo:   'bg-ha-primary/15 text-ha-primary',
  green:    'bg-ha-teal/15 text-ha-teal',
  yellow:   'bg-ha-accent/15 text-ha-accent',
  red:      'bg-ha-danger/15 text-ha-danger',
  orange:   'bg-ha-primary/15 text-ha-primary',
  blue:     'bg-ha-teal/15 text-ha-teal',
  purple:   'bg-ha-surface-2 text-ha-text-2',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusBadge(status) {
  const map = {
    pending:   { label: 'Pending',   variant: 'yellow' },
    accepted:  { label: 'Accepted',  variant: 'teal' },
    declined:  { label: 'Declined',  variant: 'red' },
    completed: { label: 'Completed', variant: 'default' },
    reviewed:  { label: 'Reviewed',  variant: 'amber' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
  };
  return map[status] || { label: status, variant: 'default' };
}
