import { get, post } from './client';

// On-demand matching
export const dispatchRequest = (data) => post('/dispatch', data);
export const rematchRequest = (bookingId) => post(`/dispatch/${bookingId}/rematch`);

// Geocoding (Nominatim via backend proxy)
export const reverseGeocode = (lat, lng) => get(`/geo/reverse?lat=${lat}&lng=${lng}`);
export const searchGeocode = (q) => get(`/geo/search?q=${encodeURIComponent(q)}`);
