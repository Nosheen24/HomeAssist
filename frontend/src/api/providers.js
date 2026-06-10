import { get } from './client';

export const getProviders = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return get(`/providers${qs ? `?${qs}` : ''}`);
};

export const getProvider = (id) => get(`/providers/${id}`);
