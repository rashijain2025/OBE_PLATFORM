import api from './axios';
import axios from 'axios';

const ML_URL = import.meta.env.VITE_ML_URL;

/**
 * Check backend health.
 */
export const getBackendHealth = () => api.get('/health');

/**
 * Check ML service health.
 * If VITE_ML_URL is configured, queries the ML service directly.
 * Otherwise, falls back to the backend /ml/model-info endpoint.
 */
export const getMlHealth = () => {
  if (ML_URL) {
    return axios.get(`${ML_URL}/health`);
  }
  return api.get('/ml/model-info');
};
