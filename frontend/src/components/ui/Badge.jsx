const variants = {
  default: 'bg-gray-100 text-gray-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusBadge(status) {
  const map = {
    pending: { label: 'Pending', variant: 'yellow' },
    accepted: { label: 'Accepted', variant: 'blue' },
    declined: { label: 'Declined', variant: 'red' },
    completed: { label: 'Completed', variant: 'green' },
    reviewed: { label: 'Reviewed', variant: 'purple' },
    cancelled: { label: 'Cancelled', variant: 'default' },
  };
  return map[status] || { label: status, variant: 'default' };
}
