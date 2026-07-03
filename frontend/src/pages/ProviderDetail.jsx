import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProvider } from '../api/providers';
import { createBooking } from '../api/bookings';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import StarRating from '../components/ui/StarRating';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { Textarea } from '../components/ui/Input';
import PaymentModal from '../components/shared/PaymentModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const inputCls = 'w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors';
const labelCls = 'block text-[13px] font-medium text-ha-text-2';

function Avatar({ name, size = 'xl' }) {
  const sizes = { lg: 'h-16 w-16 text-2xl', xl: 'h-20 w-20 text-3xl' };
  const colors = [
    'bg-ha-primary/20 text-ha-primary',
    'bg-ha-teal/20 text-ha-teal',
    'bg-ha-accent/20 text-ha-accent',
    'bg-ha-danger/20 text-ha-danger',
  ];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [address, setAddress] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [booking, setBooking] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [payFor, setPayFor] = useState(null);

  useEffect(() => {
    getProvider(id)
      .then((data) => {
        setProvider(data);
        if (data.services?.length > 0) setSelectedService(data.services[0]);
      })
      .catch(() => navigate('/search'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!selectedService || !scheduledAt || !address) {
      toast('Please fill in all required fields', 'error');
      return;
    }
    setBooking(true);
    try {
      const created = await createBooking({
        providerId: provider.id,
        serviceId: selectedService.id,
        scheduledAt: new Date(scheduledAt).toISOString(),
        address,
        customerLat: customerCoords?.latitude ?? null,
        customerLng: customerCoords?.longitude ?? null,
        customerLocationLabel: shareLocation ? 'Live GPS pin shared by customer' : null,
        problemDescription: problemDesc,
      });
      toast('Booking created — complete payment to confirm', 'success');
      setPayFor({
        bookingId: created.id,
        amount: selectedService.price,
        serviceTitle: selectedService.title,
      });
    } catch (err) {
      toast(err.message || 'Booking failed', 'error');
    } finally {
      setBooking(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support GPS sharing.');
      return;
    }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setShareLocation(true);
        setLocationLoading(false);
        toast('Live GPS pin added to this booking', 'success');
      },
      (error) => {
        setLocationLoading(false);
        setLocationError(error.message || 'Unable to read your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!provider) return null;

  const { user: pUser, services, availability, reviews, avgRating, reviewCount, isVerified, bio, experienceYears } = provider;
  const minPrice = services?.length > 0 ? Math.min(...services.map((s) => s.price)) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile header */}
          <div className="bg-ha-surface rounded-xl border border-ha-border p-6">
            <div className="flex items-start gap-4">
              <Avatar name={pUser?.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-ha-text-1 font-display">{pUser?.name}</h1>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ha-teal bg-ha-teal/10 border border-ha-teal/30 px-2.5 py-0.5 rounded-full">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-ha-text-3">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">{pUser?.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <StarRating rating={avgRating} size="md" />
                      <span className="font-bold text-ha-text-1 font-mono">{Number(avgRating).toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-ha-text-3 mt-0.5">{reviewCount} reviews</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-3">
                  {experienceYears > 0 && (
                    <span className="text-xs text-ha-text-2 bg-ha-surface-2 border border-ha-border px-2.5 py-1 rounded-full">
                      {experienceYears} yrs experience
                    </span>
                  )}
                  {minPrice && (
                    <span className="text-xs text-ha-accent bg-ha-accent/10 border border-ha-accent/30 px-2.5 py-1 rounded-full font-mono">
                      From PKR {Number(minPrice).toLocaleString()}
                    </span>
                  )}
                </div>

                {bio && <p className="mt-3 text-sm text-ha-text-2 leading-relaxed">{bio}</p>}
              </div>
            </div>
          </div>

          {/* Services */}
          {services?.length > 0 && (
            <div className="bg-ha-surface rounded-xl border border-ha-border p-6">
              <h2 className="text-lg font-semibold text-ha-text-1 font-display mb-4">Services Offered</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-start justify-between p-3 rounded-xl border border-ha-border hover:border-ha-primary/50 hover:bg-ha-primary/5 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-ha-text-1">{svc.title}</p>
                      <Badge variant="indigo" className="mt-1">{svc.category?.name}</Badge>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-ha-accent font-mono">PKR {Number(svc.price).toLocaleString()}</p>
                      <p className="text-xs text-ha-text-3">{svc.priceUnit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          {availability?.length > 0 && (
            <div className="bg-ha-surface rounded-xl border border-ha-border p-6">
              <h2 className="text-lg font-semibold text-ha-text-1 font-display mb-4">Availability</h2>
              <div className="flex flex-wrap gap-2">
                {availability.map((slot) => (
                  <div key={slot.id} className="px-3 py-1.5 bg-ha-teal/10 border border-ha-teal/30 rounded-lg text-sm">
                    <span className="font-medium text-ha-teal">{DAYS[slot.dayOfWeek]}</span>
                    <span className="text-ha-teal/70 ml-1.5">{slot.startTime} – {slot.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews?.length > 0 && (
            <div className="bg-ha-surface rounded-xl border border-ha-border p-6">
              <h2 className="text-lg font-semibold text-ha-text-1 font-display mb-4">Customer Reviews</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="pb-4 border-b border-ha-border last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ha-text-1">
                        {review.booking?.customer?.name || 'Customer'}
                      </span>
                      <span className="text-xs text-ha-text-3">
                        {new Date(review.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                      </span>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                    {review.comment && (
                      <p className="mt-1.5 text-sm text-ha-text-2">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-ha-surface rounded-xl border border-ha-border p-6 sticky top-20">
            <h2 className="text-lg font-semibold text-ha-text-1 font-display mb-4">Book This Provider</h2>

            {user?.role !== 'customer' && user?.role !== undefined ? (
              <div className="text-center py-4 text-sm text-ha-text-3">
                <p>Only customers can make bookings.</p>
                {!user && (
                  <Button className="mt-3 w-full" onClick={() => navigate('/login')}>
                    Sign in to Book
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleBook} className="space-y-4">
                <div className="space-y-1">
                  <label className={labelCls}>Select Service</label>
                  <select
                    value={selectedService?.id || ''}
                    onChange={(e) => setSelectedService(services.find((s) => s.id === parseInt(e.target.value)))}
                    className={inputCls}
                    required
                  >
                    {services?.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.title} — PKR {Number(svc.price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Preferred Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className={inputCls}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Your Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House #, Street, Area"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="rounded-xl border border-ha-border bg-ha-surface-2 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ha-text-1">Live tracking destination pin</p>
                      <p className="text-xs text-ha-text-3 mt-0.5">
                        Share your GPS position so the provider can see a map route and ETA.
                      </p>
                    </div>
                    <span className={`text-xs font-medium rounded-full px-2.5 py-1 border ${shareLocation ? 'bg-ha-teal/10 text-ha-teal border-ha-teal/30' : 'bg-ha-bg text-ha-text-3 border-ha-border'}`}>
                      {shareLocation ? 'Enabled' : 'Optional'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="secondary" size="sm" loading={locationLoading} onClick={useCurrentLocation}>
                      Use my current location
                    </Button>
                    {customerCoords && (
                      <span className="text-xs text-ha-teal bg-ha-teal/10 border border-ha-teal/30 rounded-full px-2.5 py-1">
                        GPS pin saved
                      </span>
                    )}
                  </div>
                  {locationError && <p className="text-xs text-ha-danger">{locationError}</p>}
                  {customerCoords && (
                    <p className="text-xs text-ha-text-3 font-mono">
                      Lat {customerCoords.latitude.toFixed(5)} · Lng {customerCoords.longitude.toFixed(5)}
                    </p>
                  )}
                </div>

                <Textarea
                  label="Problem Description (optional)"
                  value={problemDesc}
                  onChange={(e) => setProblemDesc(e.target.value)}
                  placeholder="Describe your issue in more detail..."
                  rows={3}
                />

                {selectedService && (
                  <div className="bg-ha-surface-2 rounded-[6px] p-3 border border-ha-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-ha-text-2">{selectedService.title}</span>
                      <span className="font-semibold text-ha-accent font-mono">PKR {Number(selectedService.price).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <Button type="submit" loading={booking} className="w-full" size="lg">
                  {user ? 'Confirm Booking' : 'Sign in to Book'}
                </Button>

                {!user && (
                  <p className="text-xs text-center text-ha-text-3">
                    <button type="button" onClick={() => navigate('/login')} className="text-ha-primary hover:underline">
                      Sign in
                    </button>{' '}
                    or{' '}
                    <button type="button" onClick={() => navigate('/register')} className="text-ha-primary hover:underline">
                      register
                    </button>{' '}
                    to make a booking
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {payFor && (
        <PaymentModal
          bookingId={payFor.bookingId}
          amount={payFor.amount}
          serviceTitle={payFor.serviceTitle}
          onClose={() => { setPayFor(null); navigate('/bookings'); }}
          onPaid={() => { setPayFor(null); navigate('/bookings'); }}
        />
      )}
    </div>
  );
}
