import { get, post, put, del } from './client';

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
