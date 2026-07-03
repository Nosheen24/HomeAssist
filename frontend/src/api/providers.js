import { get, post, put, del, patch } from './client';

export const setMyAvailability = (isAvailable) => patch('/providers/me/availability', { isAvailable });

// Provider broadcasts live GPS while online (called on an interval from the dashboard).
export const pingMyLocation = (coords) => patch('/providers/me/location', coords);

// Live discovery: verified + available providers near a point, sorted by distance.
export const getNearbyProviders = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return get(`/providers/nearby${qs ? `?${qs}` : ''}`);
};

export const getProviders = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return get(`/providers${qs ? `?${qs}` : ''}`);
};

export const getProvider = (id) => get(`/providers/${id}`);
export const getMyProviderProfile = () => get('/providers/me/profile');
export const updateProviderProfile = (id, data) => put(`/providers/${id}`, data);
export const addProviderService = (id, data) => post(`/providers/${id}/services`, data);
export const deleteProviderService = (id, serviceId) => del(`/providers/${id}/services/${serviceId}`);
export const updateAvailability = (id, slots) => put(`/providers/${id}/availability`, { slots });
