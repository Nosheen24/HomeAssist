import { get, post } from './client';

export const getMessages = (bookingId) => get(`/messages/${bookingId}`);
export const sendMessage = (bookingId, content) => post(`/messages/${bookingId}`, { content });
