import { get, post } from './client';

export const login = (email, password) => post('/auth/login', { email, password });
export const register = (data) => post('/auth/register', data);
export const getMe = () => get('/auth/me');
