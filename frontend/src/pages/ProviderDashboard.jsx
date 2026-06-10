import { useState, useEffect } from 'react';
import { getProviderBookings, updateBookingStatus } from '../api/bookings';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Skeleton from '../components/ui/Skeleton';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

const BOOKING_TABS = [
  { key: 'pending', label: 'New Requests', statuses: ['pending'] },
  { key: 'accepted', label: 'Upcoming', statuses: ['accepted'] },
  { key: 'done', label: 'Completed', statuses: ['completed', 'reviewed'] },
  { key: 'other', label: 'Other', statuses: ['declined', 'cancelled'] },
];

export default function ProviderDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  const load = () => {
    setLoading(true);
    getProviderBookings()
      .then(setBookings)
      .catch(() => toast('Failed to load bookings', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (id, status) => {
    setActionLoading(id + status);
    try {
      await updateBookingStatus(id, status);
      toast(`Booking ${status}`, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = bookings.filter((b) => b.status === 'pending').length;
  const accepted = bookings.filter((b) => b.status === 'accepted').length;
  const completed = bookings.filter((b) => ['completed', 'reviewed'].includes(b.status)).length;
  const ratings = bookings.flatMap((b) => b.review ? [b.review.rating] : []);
  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : '—';

  const currentStatuses = BOOKING_TABS.find((t) => t.key === tab)?.statuses || [];
  const filtered = bookings.filter((b) => currentStatuses.includes(b.status));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name?.split(' ')[0]}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Requests" value={pending} icon="📬" color="bg-yellow-50" />
        <StatCard label="Upcoming Jobs" value={accepted} icon="📅" color="bg-blue-50" />
        <StatCard label="Completed" value={completed} icon="✅" color="bg-green-50" />
        <StatCard label="Avg Rating" value={avgRating} icon="⭐" color="bg-indigo-50" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {BOOKING_TABS.map((t) => {
          const count = bookings.filter((b) => t.statuses.includes(b.status)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
              {count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-900">No bookings in this category</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const { label, variant } = statusBadge(b.status);
            const scheduledDate = new Date(b.scheduledAt);
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{b.service?.title}</p>
                    <p className="text-sm text-gray-600">{b.customer?.name}</p>
                    {b.customer?.phone && (
                      <p className="text-xs text-gray-400">{b.customer.phone}</p>
                    )}
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  <span>📅 {scheduledDate.toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
                  <span>🕐 {scheduledDate.toLocaleTimeString('en-PK', { timeStyle: 'short' })}</span>
                  <span className="col-span-2">📍 {b.address}</span>
                  {b.problemDescription && (
                    <span className="col-span-2 text-gray-600 italic">"{b.problemDescription}"</span>
                  )}
                </div>

                {b.review && (
                  <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                    <StarRating rating={b.review.rating} size="sm" />
                    {b.review.comment && <span className="text-xs text-gray-600">"{b.review.comment}"</span>}
                  </div>
                )}

                {b.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      className="flex-1"
                      loading={actionLoading === b.id + 'accepted'}
                      onClick={() => handleAction(b.id, 'accepted')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex-1"
                      loading={actionLoading === b.id + 'declined'}
                      onClick={() => handleAction(b.id, 'declined')}
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {b.status === 'accepted' && (
                  <Button
                    size="sm"
                    className="w-full"
                    loading={actionLoading === b.id + 'completed'}
                    onClick={() => handleAction(b.id, 'completed')}
                  >
                    Mark as Completed
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
