import { get, post } from './client';

export const payBooking = (bookingId, method) => post('/payments/pay', { bookingId, method });
export const releasePayment = (bookingId) => post('/payments/release', { bookingId });
export const getWallet = () => get('/payments/wallet');
export const getPaymentStats = () => get('/payments/admin/stats');
