import { post } from './client';

export const getRecommendation = (problem, location) =>
  post('/ai/recommend', { problem, location });
