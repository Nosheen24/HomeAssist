import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategories } from '../api/categories';
import { dispatchRequest, rematchRequest, reverseGeocode, searchGeocode } from '../api/dispatch';
import { getBooking, updateBookingStatus } from '../api/bookings';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import LiveTrackerMap from '../components/shared/LiveTrackerMap';
import PaymentModal from '../components/shared/PaymentModal';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (n) => `PKR ${Number(n || 0).toLocaleString()}`;
const fmtKm = (km) => (km == null ? '—' : km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km).toFixed(1)} km`);
const fmtEta = (m) => (m == null ? '—' : m <= 1 ? '1 min' : `${m} mins`);

// ─── Tap-to-set location picker (Leaflet + CartoDB Positron) ──────────────────
function LocationPicker({ coords, onPick }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!ref.current || mapRef.current) return undefined;
    const center = coords ? [coords.lat, coords.lng] : [31.5204, 74.3587];
    const map = L.map(ref.current, { attributionControl: false }).setView(center, coords ? 15 : 11);
    mapRef.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);
    if (coords) markerRef.current = L.marker([coords.lat, coords.lng]).addTo(map);
    map.on('click', (e) => onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coords) return;
    if (markerRef.current) markerRef.current.setLatLng([coords.lat, coords.lng]);
    else markerRef.current = L.marker([coords.lat, coords.lng]).addTo(map);
    map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 14));
  }, [coords?.lat, coords?.lng]);

  return (
    <div ref={ref} className="h-52 w-full rounded-xl overflow-hidden border border-ha-border bg-ha-surface-2" />
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_UI = {
  pending:   { title: 'Pro assigned — waiting to accept', tone: 'bg-ha-accent/10 text-ha-accent border-ha-accent/30', pulse: true },
  accepted:  { title: 'On the way to you', tone: 'bg-ha-teal/10 text-ha-teal border-ha-teal/30', pulse: true },
  completed: { title: 'Job completed', tone: 'bg-ha-primary/10 text-ha-primary border-ha-primary/30', pulse: false },
  declined:  { title: 'Provider unavailable', tone: 'bg-ha-danger/10 text-ha-danger border-ha-danger/30', pulse: false },
  cancelled: { title: 'Request cancelled', tone: 'bg-ha-surface-2 text-ha-text-3 border-ha-border', pulse: false },
};

export default function RequestService() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [coords, setCoords] = useState(null);
  const [addressLabel, setAddressLabel] = useState('');
  const [problem, setProblem] = useState('');
  const [locating, setLocating] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [phase, setPhase] = useState('form'); // 'form' | 'searching' | 'tracking'
  const [booking, setBooking] = useState(null);
  const [match, setMatch] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);

  // Reverse-geocode whenever a fresh pin is set (keeps the address in sync).
  const applyCoords = useCallback(async (c) => {
    setCoords(c);
    try {
      const r = await reverseGeocode(c.lat, c.lng);
      if (r?.label) setAddressLabel(r.label);
    } catch { /* keep manual address */ }
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast('Your browser does not support GPS', 'error'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); applyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast('Location set', 'success'); },
      () => { setLocating(false); toast('Could not read your location — pick it on the map', 'error'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const runSearch = async () => {
    if (searchText.trim().length < 3) return;
    try {
      const res = await searchGeocode(searchText.trim());
      setSearchResults(res);
      if (!res.length) toast('No matches — try a more specific address', 'info');
    } catch { toast('Address search failed', 'error'); }
  };

  // ─── Dispatch ───────────────────────────────────────────────────────────────
  const handleDispatch = async () => {
    if (!user) return navigate('/login');
    if (!category) { toast('Choose what you need', 'error'); return; }
    if (!coords) { toast('Set your location first', 'error'); return; }
    setPhase('searching');
    try {
      const [res] = await Promise.all([
        dispatchRequest({
          categorySlug: category,
          customerLat: coords.lat,
          customerLng: coords.lng,
          address: addressLabel || 'Customer location',
          customerLocationLabel: addressLabel || null,
          problemDescription: problem || null,
        }),
        sleep(1300), // let the "searching" radar breathe
      ]);
      setBooking(res.booking);
      setMatch(res.match);
      setPhase('tracking');
      setPayTarget({ bookingId: res.booking.id, amount: res.booking.service?.price, serviceTitle: res.booking.service?.title });
    } catch (err) {
      setPhase('form');
      toast(err.message || 'No providers available nearby', 'error');
    }
  };

  // ─── Live polling while tracking ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'tracking' || !booking?.id) return undefined;
    if (['completed', 'cancelled'].includes(booking.status)) return undefined;
    const id = setInterval(async () => {
      try { setBooking(await getBooking(booking.id)); } catch { /* keep last */ }
    }, 10000);
    return () => clearInterval(id);
  }, [phase, booking?.id, booking?.status]);

  const handleRematch = async () => {
    setWorking(true);
    try {
      const res = await rematchRequest(booking.id);
      setBooking(res.booking);
      setMatch(res.match);
      toast(`Reassigned to ${res.match.name}`, 'success');
    } catch (err) {
      toast(err.message || 'No other providers available', 'error');
    } finally { setWorking(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this request?')) return;
    setWorking(true);
    try {
      const updated = await updateBookingStatus(booking.id, 'cancelled');
      setBooking(updated);
      toast('Request cancelled', 'info');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setWorking(false); }
  };

  const resetAll = () => {
    setPhase('form'); setBooking(null); setMatch(null); setPayTarget(null);
  };

  // ─── Searching overlay ────────────────────────────────────────────────────────
  if (phase === 'searching') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center bg-ha-bg min-h-screen">
        <div className="relative mx-auto h-32 w-32">
          <span className="absolute inset-0 rounded-full bg-ha-primary/20 animate-ping" />
          <span className="absolute inset-4 rounded-full bg-ha-primary/30 animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">📡</div>
        </div>
        <h2 className="mt-8 text-xl font-bold text-ha-text-1 font-display">Finding the nearest pro…</h2>
        <p className="mt-2 text-sm text-ha-text-3">Matching you with an available verified professional near you.</p>
      </div>
    );
  }

  // ─── Tracking view ────────────────────────────────────────────────────────────
  if (phase === 'tracking' && booking) {
    const st = STATUS_UI[booking.status] || STATUS_UI.pending;
    const providerName = match?.name || booking.provider?.user?.name;
    const providerPhone = booking.provider?.user?.phone;
    const provLat = booking.providerLat ?? match?.lat;
    const provLng = booking.providerLng ?? match?.lng;
    const unpaid = booking.paymentStatus === 'unpaid';

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ha-text-1 font-display">Your request</h1>
          <span className={`text-xs font-medium rounded-full px-3 py-1 border ${st.tone}`}>{st.title}</span>
        </div>

        {/* Provider card */}
        <div className="bg-ha-surface rounded-2xl border border-ha-border p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-ha-primary/15 text-ha-primary flex items-center justify-center text-lg font-bold">
                {providerName?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-ha-text-1">{providerName}</p>
                <p className="text-xs text-ha-text-3">
                  ⭐ {Number(match?.avgRating ?? booking.provider?.avgRating ?? 0).toFixed(1)} · {booking.service?.title}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-ha-text-1">{fmtKm(booking.distanceKm ?? match?.distanceKm)}</p>
              <p className="text-xs text-ha-text-3">ETA {fmtEta(booking.etaMinutes ?? match?.etaMinutes)}</p>
            </div>
          </div>

          {booking.status === 'accepted' && providerPhone && (
            <a href={`tel:${providerPhone}`} className="mt-4 block">
              <Button variant="secondary" className="w-full">📞 Call {providerName?.split(' ')[0]}</Button>
            </a>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {unpaid && booking.status !== 'cancelled' && (
              <Button size="sm" onClick={() => setPayTarget({ bookingId: booking.id, amount: booking.service?.price, serviceTitle: booking.service?.title })}>
                Pay {money(booking.service?.price)}
              </Button>
            )}
            {['pending', 'declined'].includes(booking.status) && (
              <Button size="sm" variant="secondary" loading={working} onClick={handleRematch}>
                Find another pro
              </Button>
            )}
            {['pending', 'accepted'].includes(booking.status) && (
              <Button size="sm" variant="danger" loading={working} onClick={handleCancel}>
                Cancel
              </Button>
            )}
            {['completed', 'cancelled'].includes(booking.status) && (
              <>
                <Button size="sm" variant="secondary" onClick={() => navigate('/bookings')}>My bookings</Button>
                <Button size="sm" onClick={resetAll}>New request</Button>
              </>
            )}
          </div>

          {booking.status === 'pending' && (
            <p className="mt-3 text-xs text-ha-text-3">
              🔒 {unpaid ? 'Pay to hold your payment in escrow — released only after the job is done.' : 'Payment is held in escrow until the job is completed.'}
            </p>
          )}
        </div>

        {/* Live map */}
        {provLat != null && provLng != null && booking.customerLat != null && (
          <LiveTrackerMap
            customerLat={booking.customerLat}
            customerLng={booking.customerLng}
            providerLat={provLat}
            providerLng={provLng}
            distanceKm={booking.distanceKm}
            etaMinutes={booking.etaMinutes}
            destinationLabel={addressLabel || booking.address}
            providerLabel={providerName}
            updatedAt={booking.providerLocationUpdatedAt}
          />
        )}

        {booking.status === 'completed' && (
          <div className="bg-ha-surface rounded-2xl border border-ha-border p-6 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold text-ha-text-1">Job done!</p>
            <p className="text-sm text-ha-text-3 mt-1">Leave a review for {providerName} from My Bookings.</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Request form ─────────────────────────────────────────────────────────────
  const canDispatch = category && coords;
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-ha-bg min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ha-text-1 font-display">Request a pro now</h1>
        <p className="text-ha-text-3 mt-1">Describe your need — we'll dispatch the nearest available professional.</p>
      </div>

      {/* 1. Category */}
      <div className="bg-ha-surface rounded-2xl border border-ha-border p-5 mb-4">
        <p className="text-[13px] font-medium text-ha-text-2 mb-3">1. What do you need?</p>
        {categories.length === 0 ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.slug)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-2 transition-all ${
                  category === c.slug ? 'border-ha-primary bg-ha-primary/5' : 'border-transparent bg-ha-surface-2 hover:bg-ha-surface'
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-[11px] font-medium text-ha-text-1 text-center leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Location */}
      <div className="bg-ha-surface rounded-2xl border border-ha-border p-5 mb-4 space-y-3">
        <p className="text-[13px] font-medium text-ha-text-2">2. Where do you need it?</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={locating} onClick={useMyLocation}>
            📍 Use my current location
          </Button>
          {coords && (
            <span className="text-xs text-ha-teal bg-ha-teal/10 border border-ha-teal/30 rounded-full px-2.5 py-1 font-mono">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Or search an address (e.g. Gulberg, Lahore)"
            className="flex-1 rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary"
          />
          <Button variant="secondary" size="sm" onClick={runSearch}>Search</Button>
        </div>
        {searchResults.length > 0 && (
          <div className="border border-ha-border rounded-xl divide-y divide-ha-border overflow-hidden">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => { applyCoords({ lat: r.lat, lng: r.lng }); setSearchResults([]); setSearchText(''); }}
                className="block w-full text-left px-3 py-2 text-xs text-ha-text-2 hover:bg-ha-surface-2 transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <LocationPicker coords={coords} onPick={applyCoords} />
        <p className="text-xs text-ha-text-3">Tap the map to drop your pin.</p>

        <input
          value={addressLabel}
          onChange={(e) => setAddressLabel(e.target.value)}
          placeholder="Address / landmark"
          className="w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary"
        />
      </div>

      {/* 3. Problem */}
      <div className="bg-ha-surface rounded-2xl border border-ha-border p-5 mb-4">
        <p className="text-[13px] font-medium text-ha-text-2 mb-2">3. Describe the problem (optional)</p>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={3}
          placeholder="e.g. Kitchen tap is leaking badly…"
          className="w-full rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary resize-none"
        />
      </div>

      <Button size="lg" className="w-full" disabled={!canDispatch} onClick={handleDispatch}>
        {user ? 'Find nearest pro' : 'Sign in to request'}
      </Button>

      {payTarget && (
        <PaymentModal
          bookingId={payTarget.bookingId}
          amount={payTarget.amount}
          serviceTitle={payTarget.serviceTitle}
          onClose={() => setPayTarget(null)}
          onPaid={async () => {
            setPayTarget(null);
            try { setBooking(await getBooking(payTarget.bookingId)); } catch { /* */ }
          }}
        />
      )}
    </div>
  );
}
