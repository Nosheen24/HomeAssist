import L from 'leaflet';

// ─── Basemap tile source (single source of truth for every map) ───────────────
//
// Default: standard OpenStreetMap raster tiles — free, no API key, and noticeably
// richer in labels/POIs than Carto Positron (which is a deliberately minimal
// "quiet background" style). Good enough for testing and for the provider-pin use
// case, where the pins + distance are the point, not landmark browsing.
//
// Upgrade path (no code change): set VITE_MAPTILER_KEY in frontend/.env to switch
// to MapTiler's "streets" style — same OSM data, denser rendering, 100k free
// requests/month. Get a key at https://cloud.maptiler.com (free, no card).
//
// Both NearbyProvidersMap and LiveTrackerMap call addBaseTiles(map).

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

export const BASE_TILE = MAPTILER_KEY
  ? {
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      options: {
        maxZoom: 20,
        attribution: '&copy; MapTiler &copy; OpenStreetMap contributors',
      },
    }
  : {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
    };

// Adds the configured basemap to a Leaflet map and returns the layer.
export function addBaseTiles(map) {
  return L.tileLayer(BASE_TILE.url, BASE_TILE.options).addTo(map);
}
