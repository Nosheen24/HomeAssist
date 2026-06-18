import { useState, useEffect } from 'react';
import { getMyBookings, updateBookingStatus, createReview } from '../api/bookings';
import { useToast } from '../components/ui/Toast';
import Badge, { statusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Skeleton from '../components/ui/Skeleton';
import LiveTrackerMap from '../components/shared/LiveTrackerMap';

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(booking.id, rating, comment);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-ha-surface rounded-2xl border border-ha-border p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-ha-text-1 mb-1">Leave a Review</h2>
        <p className="text-sm text-ha-text-3 mb-4">{booking.provider?.user?.name} · {booking.service?.title}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ha-text-2 mb-2">Rating</label>
            <StarRating rating={rating} size="xl" interactive onChange={setRating} />
          </div>
          <div className="space-y-1">
            <label className="block text-[13px] font-medium text-ha-text-2">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your experience..."
              className="w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Submit Review</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingCard({ booking, onCancel, onReview }) {
  const { label, variant } = statusBadge(booking.status);
  const scheduledDate = new Date(booking.scheduledAt);
  const canShowLiveTracker =
    booking.status === 'accepted' &&
    booking.providerLat != null && booking.providerLng != null &&
    booking.customerLat != null && booking.customerLng != null;

  return (
    <div className="bg-ha-surface rounded-xl border border-ha-border p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-ha-text-1">{booking.service?.title || 'Service'}</p>
          <p className="text-sm text-ha-text-3 mt-0.5">{booking.provider?.user?.name}</p>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-ha-text-3 mb-4">
        <div className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {scheduledDate.toLocaleDateString('en-PK', { dateStyle: 'medium' })}
        </div>
        <div className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {scheduledDate.toLocaleTimeString('en-PK', { timeStyle: 'short' })}
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {booking.address}
        </div>
      </div>

      {booking.status === 'accepted' && (
        <div className="mt-4 space-y-3">
          {canShowLiveTracker ? (
            <LiveTrackerMap
              customerLat={booking.customerLat} customerLng={booking.customerLng}
              providerLat={booking.providerLat} providerLng={booking.providerLng}
              distanceKm={booking.distanceKm} etaMinutes={booking.etaMinutes}
              destinationLabel={booking.customerLocationLabel || booking.address}
              providerLabel={booking.provider?.user?.name || 'Provider'}
              updatedAt={booking.providerLocationUpdatedAt}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-ha-border-2 bg-ha-surface-2 p-4">
              <p className="text-sm font-medium text-ha-text-1">Live tracker not ready yet</p>
              <p className="mt-1 text-sm text-ha-text-3">
                The provider accepted your request. Once live GPS sharing starts, the map will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {booking.status === 'completed' && !booking.review && (
        <Button size="sm" className="w-full mt-3" onClick={() => onReview(booking)}>
          Leave a Review
        </Button>
      )}
      {booking.status === 'reviewed' && booking.review && (
        <div className="flex items-center gap-2 bg-ha-surface-2 rounded-[6px] px-3 py-2 mt-3">
          <StarRating rating={booking.review.rating} size="sm" />
          <span className="text-xs text-ha-text-3">You rated {booking.review.rating}/5</span>
        </div>
      )}
      {booking.status === 'pending' && (
        <Button size="sm" variant="danger" className="w-full mt-3" onClick={() => onCancel(booking.id)}>
          Cancel Booking
        </Button>
      )}
    </div>
  );
}

const TABS = [
  { key: 'active',    label: 'Active',    statuses: ['pending', 'accepted'] },
  { key: 'completed', label: 'Completed', statuses: ['completed', 'reviewed'] },
  { key: 'other',     label: 'Cancelled', statuses: ['declined', 'cancelled'] },
];

export default function Bookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [reviewTarget, setReviewTarget] = useState(null);

  const load = () => {
    setLoading(true);
    getMyBookings()
      .then(setBookings)
      .catch(() => toast('Failed to load bookings', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!bookings.some((b) => b.status === 'accepted')) return undefined;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [bookings]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await updateBookingStatus(id, 'cancelled');
      toast('Booking cancelled', 'info');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleReview = async (bookingId, rating, comment) => {
    try {
      await createReview({ bookingId, rating, comment });
      toast('Review submitted!', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  };

  const currentStatuses = TABS.find((t) => t.key === tab)?.statuses || [];
  const filtered = bookings.filter((b) => currentStatuses.includes(b.status));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <h1 className="text-2xl font-bold text-ha-text-1 font-display mb-6">My Bookings</h1>

      <div className="flex gap-1 bg-ha-surface border border-ha-border p-1 rounded-xl mb-6">
        {TABS.map((t) => {
          const count = bookings.filter((b) => t.statuses.includes(b.status)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[4px] text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-ha-surface-2 text-ha-text-1' : 'text-ha-text-3 hover:text-ha-text-2'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  tab === t.key ? 'bg-ha-primary/15 text-ha-primary' : 'bg-ha-surface-2 text-ha-text-3'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-ha-surface rounded-xl border border-ha-border">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-ha-text-1 mb-1">No bookings here</h3>
          <p className="text-sm text-ha-text-3">Your {tab} bookings will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} onCancel={handleCancel} onReview={setReviewTarget} />
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleReview}
        />
      )}
    </div>
  );
}
