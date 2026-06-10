import { get, post, patch } from './client';

export const createBooking = (data) => post('/bookings', data);
export const getMyBookings = () => get('/bookings/mine');
export const getProviderBookings = () => get('/bookings/provider');
export const updateBookingStatus = (id, status) => patch(`/bookings/${id}/status`, { status });
export const createReview = (data) => post('/reviews', data);
