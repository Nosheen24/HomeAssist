import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function calculateBearing(lat1, lng1, lat2, lng2) {
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);
  const deltaLng = toRadians(lng2 - lng1);
  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function formatDistance(distanceKm) {
  if (distanceKm == null || Number.isNaN(distanceKm)) return '—';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function formatEta(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 min';
  return `${minutes} mins`;
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return 'Waiting for live GPS update';
  const timestamp = new Date(updatedAt).getTime();
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes === 1) return 'Updated 1 min ago';
  return `Updated ${diffMinutes} mins ago`;
}

export default function LiveTrackerMap({
  customerLat,
  customerLng,
  providerLat,
  providerLng,
  distanceKm,
  etaMinutes,
  destinationLabel,
  providerLabel,
  updatedAt,
  className = '',
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const hasCoordinates =
    customerLat != null && customerLng != null && providerLat != null && providerLng != null;
  const routeBearing = hasCoordinates ? calculateBearing(providerLat, providerLng, customerLat, customerLng) : 0;

  const effectiveDistanceKm =
    distanceKm ??
    (hasCoordinates ? haversineDistanceKm(providerLat, providerLng, customerLat, customerLng) : null);
  const effectiveEtaMinutes =
    etaMinutes ??
    (effectiveDistanceKm == null ? null : Math.max(1, Math.round((effectiveDistanceKm / 26) * 60)));

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (!hasCoordinates || !containerRef.current) return undefined;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const providerPoint = [providerLat, providerLng];
    const destinationPoint = [customerLat, customerLng];
    const midpoint = [(providerLat + customerLat) / 2, (providerLng + customerLng) / 2];

    const arrowIcon = L.divIcon({
      className: '',
      html: `
        <div style="transform: rotate(${routeBearing}deg);" class="relative flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 border border-sky-200">
          <span class="absolute inset-0 rounded-full bg-sky-400/20 animate-ping"></span>
          <span class="relative text-lg leading-none">➤</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const destinationIcon = L.divIcon({
      className: '',
      html: `
        <div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-200">
          <span class="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse"></span>
          <span class="relative text-lg leading-none">⌂</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker(providerPoint, { icon: arrowIcon })
      .addTo(map)
      .bindPopup(`${providerLabel || 'Provider'} is moving toward the customer`);

    L.marker(destinationPoint, { icon: destinationIcon })
      .addTo(map)
      .bindPopup(destinationLabel || 'Customer destination');

    L.polyline([providerPoint, destinationPoint], {
      color: '#38bdf8',
      weight: 5,
      opacity: 0.95,
      dashArray: '10,10',
      lineCap: 'round',
    }).addTo(map);

    L.circleMarker(midpoint, {
      radius: 4,
      color: '#38bdf8',
      weight: 2,
      fillColor: '#bae6fd',
      fillOpacity: 0.8,
    })
      .addTo(map)
      .bindTooltip('Direction of travel', { permanent: true, direction: 'top', className: 'text-xs' });

    map.fitBounds([providerPoint, destinationPoint], { padding: [36, 36] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [customerLat, customerLng, providerLat, providerLng, hasCoordinates, destinationLabel, providerLabel]);

  return (
    <div className={`rounded-2xl border border-sky-200 bg-slate-950 text-white shadow-lg overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80">
        <div>
          <p className="text-sm font-semibold text-white">Live route tracker</p>
          <p className="text-xs text-slate-300 mt-0.5">{formatUpdatedAt(updatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-300 border border-sky-400/20">
            {formatDistance(effectiveDistanceKm)} away
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300 border border-emerald-400/20">
            Remaining {formatEta(effectiveEtaMinutes)}
          </span>
        </div>
      </div>

      {hasCoordinates ? (
        <>
          <div ref={containerRef} className="h-72 w-full bg-slate-900" />
          <div className="p-4 space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-300 border border-sky-400/20">Start: provider</span>
              <span className="text-sky-300 text-lg">→</span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300 border border-emerald-400/20">End: customer</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-slate-400">Start point</p>
                <p className="font-medium text-white mt-1">{providerLabel || 'Provider live GPS'}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-slate-400">Destination</p>
                <p className="font-medium text-white mt-1">{destinationLabel || 'Customer location'}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xl">
            📍
          </div>
          <p className="font-medium text-white">Waiting for live location sharing</p>
          <p className="mt-1 text-sm text-slate-300">
            Once the provider shares GPS and the customer destination pin is available, the route tracker will appear here.
          </p>
        </div>
      )}
    </div>
  );
}