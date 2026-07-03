import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getNearbyProviders } from '../../api/providers';
import { addBaseTiles } from '../../lib/mapTiles';

// How often we re-query nearby providers (and re-center pins) while the map is open.
const POLL_MS = 8000;

// Category → pin colour, so a customer can read the map at a glance (matches the
// ha-* design language: warm, saturated, one hue per trade).
const CATEGORY_COLORS = {
  plumbing: '#3B82F6',
  electrical: '#F59E0B',
  cleaning: '#22C55E',
  'ac-repair': '#0EA5E9',
  painting: '#A855F7',
  carpentry: '#D97706',
  'appliance-repair': '#EC4899',
  gardening: '#14B8A6',
};
const DEFAULT_COLOR = '#16A34A';

const CATEGORIES = [
  { slug: '', name: 'All services' },
  { slug: 'plumbing', name: 'Plumbing' },
  { slug: 'electrical', name: 'Electrical' },
  { slug: 'cleaning', name: 'Cleaning' },
  { slug: 'ac-repair', name: 'AC Repair' },
  { slug: 'painting', name: 'Painting' },
  { slug: 'carpentry', name: 'Carpentry' },
  { slug: 'appliance-repair', name: 'Appliance Repair' },
  { slug: 'gardening', name: 'Gardening' },
];

function providerColor(p) {
  const slug = p.services?.[0]?.category?.slug;
  return CATEGORY_COLORS[slug] || DEFAULT_COLOR;
}

function fromPrice(p) {
  const prices = (p.services || []).map((s) => s.price).filter((n) => n != null);
  return prices.length ? Math.min(...prices) : null;
}

function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const inputCls =
  'rounded-lg border border-ha-border bg-white px-3 py-2 text-sm text-ha-text-1 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors';

export default function NearbyProvidersMap({ className = '' }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null); // L.layerGroup for provider pins
  const meMarkerRef = useRef(null);
  const centeredRef = useRef(false); // only auto-center once, on first fix

  const [coords, setCoords] = useState(null); // { lat, lng }
  const [geoError, setGeoError] = useState('');
  const [providers, setProviders] = useState([]);
  const [expanded, setExpanded] = useState(false); // showing nearest beyond radius
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category: '', minRating: '', maxPrice: '', radius: '25' });

  // ── Watch the customer's location ───────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('This browser does not support location. Try Chrome or Safari on your phone.');
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError('');
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => setGeoError(err.message || 'Enable location access to see providers near you.'),
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Fetch nearby providers (used for both polling and filter re-queries) ─────
  const fetchNearby = useCallback(() => {
    if (!coords) return;
    setLoading(true);
    const base = {
      lat: coords.lat,
      lng: coords.lng,
      category: filters.category,
      minRating: filters.minRating,
      maxPrice: filters.maxPrice,
    };
    getNearbyProviders({ ...base, radius: filters.radius })
      .then((d) => {
        const list = d.providers || [];
        if (list.length > 0) {
          setProviders(list);
          setExpanded(false);
          return null;
        }
        // Nothing within the chosen radius — often just imprecise desktop
        // geolocation. Fall back to the nearest available providers country-wide
        // so the demo is never empty, and flag that we widened the search.
        return getNearbyProviders({ ...base, radius: 2000 }).then((d2) => {
          const wide = d2.providers || [];
          setProviders(wide);
          setExpanded(wide.length > 0);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coords, filters]);

  // Poll every 8s while we have a location + filters (re-queries immediately on change).
  useEffect(() => {
    if (!coords) return undefined;
    fetchNearby();
    const id = setInterval(fetchNearby, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNearby, coords]);

  // ── Create the map once, when we first have coordinates ──────────────────────
  useEffect(() => {
    if (!coords || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([coords.lat, coords.lng], 14);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    centeredRef.current = true;

    // Shared basemap: OSM standard by default (denser labels than Positron),
    // MapTiler streets when VITE_MAPTILER_KEY is set. See lib/mapTiles.js.
    addBaseTiles(map);

    markersRef.current = L.layerGroup().addTo(map);

    // Navigate through react-router when a popup "View & Book" button is clicked.
    map.on('popupopen', (e) => {
      const btn = e.popup?._contentNode?.querySelector('[data-provider-id]');
      if (btn) btn.onclick = () => navigate(`/providers/${btn.dataset.providerId}`);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      meMarkerRef.current = null;
      centeredRef.current = false;
    };
  }, [coords, navigate]);

  // ── Keep the "you" marker in sync ────────────────────────────────────────────
  useEffect(() => {
    if (!coords || !mapRef.current) return;
    const meIcon = L.divIcon({
      className: '',
      html: `
        <div class="relative flex h-6 w-6 items-center justify-center">
          <span class="absolute inline-flex h-6 w-6 rounded-full bg-sky-400/30 animate-ping"></span>
          <span class="relative inline-flex h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow"></span>
        </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    if (!meMarkerRef.current) {
      meMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: meIcon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup('You are here');
    } else {
      meMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    }
  }, [coords]);

  // ── Re-draw provider pins whenever the list changes ──────────────────────────
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    providers.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const color = providerColor(p);
      const category = p.services?.[0]?.category;
      const price = fromPrice(p);
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:36px;height:48px;filter:drop-shadow(0 3px 3px rgba(0,0,0,0.35))">
            <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 18 30 18 30s18-17.4 18-30C36 8.06 27.94 0 18 0z"
                    fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
              <circle cx="18" cy="18" r="10.5" fill="#ffffff"/>
            </svg>
            <span style="position:absolute;top:8px;left:0;width:36px;text-align:center;font-size:17px;line-height:1">${category?.icon || '🛠️'}</span>
          </div>`,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -44],
      });

      const popup = `
        <div style="min-width:180px;font-family:inherit">
          <div style="font-weight:700;color:#1A110A">${escapeHtml(p.user?.name || 'Provider')}</div>
          <div style="font-size:12px;color:#4A3D35;margin-top:2px">
            ${category ? escapeHtml(category.name) : 'Service pro'} · ⭐ ${Number(p.avgRating || 0).toFixed(1)}
            <span style="color:#8A7A6E">(${p.reviewCount || 0})</span>
          </div>
          <div style="font-size:12px;color:#4A3D35;margin-top:2px">
            📍 ${formatDistance(p.distanceKm)} away${price != null ? ` · from Rs ${Number(price).toLocaleString()}` : ''}
          </div>
          <button data-provider-id="${p.id}"
            style="margin-top:8px;width:100%;background:#16A34A;color:#fff;border:none;border-radius:8px;padding:8px 10px;font-size:13px;font-weight:600;cursor:pointer">
            View &amp; Book →
          </button>
        </div>`;

      L.marker([p.lat, p.lng], { icon })
        .addTo(markersRef.current)
        .bindPopup(popup);
    });

    // When we've widened the search (nearest are far away), zoom out to show them
    // alongside the customer so the pins are actually on screen.
    if (expanded && providers.length && coords) {
      const pts = providers.map((p) => [p.lat, p.lng]).concat([[coords.lat, coords.lng]]);
      mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 14 });
    }
  }, [providers, expanded, coords]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const recenter = () => {
    if (coords && mapRef.current) mapRef.current.setView([coords.lat, coords.lng], 14);
  };

  return (
    <div className={`rounded-2xl border border-ha-border bg-ha-surface shadow-card overflow-hidden ${className}`}>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-ha-border bg-ha-surface-2/50">
        <select className={inputCls} value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select className={inputCls} value={filters.minRating} onChange={(e) => setFilter('minRating', e.target.value)}>
          <option value="">Any rating</option>
          <option value="3">3★ & up</option>
          <option value="4">4★ & up</option>
          <option value="4.5">4.5★ & up</option>
        </select>
        <select className={inputCls} value={filters.maxPrice} onChange={(e) => setFilter('maxPrice', e.target.value)}>
          <option value="">Any price</option>
          <option value="500">Under Rs 500</option>
          <option value="1000">Under Rs 1,000</option>
          <option value="2000">Under Rs 2,000</option>
          <option value="5000">Under Rs 5,000</option>
        </select>
        <select className={inputCls} value={filters.radius} onChange={(e) => setFilter('radius', e.target.value)}>
          <option value="2">Within 2 km</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
          <option value="50">Within 50 km</option>
        </select>
        <div className="ml-auto flex items-center gap-2 text-xs text-ha-text-3">
          {loading && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ha-primary animate-ping" />
              updating…
            </span>
          )}
          <span className="font-semibold text-ha-text-2">{providers.length} {expanded ? 'nearest' : 'nearby'}</span>
        </div>
      </div>

      {/* Widened-search notice (desktop geolocation is often imprecise) */}
      {expanded && providers.length > 0 && (
        <div className="px-4 py-2 bg-ha-accent/10 border-b border-ha-accent/30 text-xs text-ha-text-2">
          No providers within {filters.radius} km of your detected location — showing the {providers.length} nearest instead.
          On a laptop your location can be off by several km; on a phone with GPS it's accurate.
        </div>
      )}

      {/* Map / empty states */}
      <div className="relative">
        <div ref={containerRef} className="h-[420px] w-full bg-ha-surface-2" />

        {!coords && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-ha-surface-2">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-card text-2xl">📍</div>
            <p className="font-semibold text-ha-text-1">
              {geoError ? 'Location unavailable' : 'Finding your location…'}
            </p>
            <p className="mt-1 text-sm text-ha-text-3 max-w-sm">
              {geoError || 'Allow location access to see verified, available providers around you in real time.'}
            </p>
          </div>
        )}

        {coords && (
          <button
            onClick={recenter}
            className="absolute bottom-4 right-4 z-[500] rounded-full bg-white border border-ha-border shadow-card p-2.5 text-ha-text-2 hover:text-ha-primary transition-colors"
            title="Recenter on me"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v2m0 16v2m10-10h-2M4 12H2" />
            </svg>
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 border-t border-ha-border text-xs text-ha-text-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-sky-500 border border-white shadow-sm" /> You
        </span>
        {CATEGORIES.filter((c) => c.slug).map((c) => (
          <span key={c.slug} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ background: CATEGORY_COLORS[c.slug] }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
