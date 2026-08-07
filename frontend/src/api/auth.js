import { get, post, patch } from './client';

export const login = (email, password) => post('/auth/login', { email, password });
export const register = (data) => post('/auth/register', data);
export const getMe = () => get('/auth/me');
export const updateProfile = (data) => patch('/auth/me', data);
