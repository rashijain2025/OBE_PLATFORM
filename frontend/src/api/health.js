import api from './axios';
import axios from 'axios';

const rawMlUrl = import.meta.env.VITE_ML_URL;
const ML_URL = rawMlUrl ? rawMlUrl.replace(/\/+$/, '') : '';

/**
 * Check backend health.
 */
export const getBackendHealth = () => api.get('/health');

/**
 * Check ML service health.
 * First queries ML service directly (if configured). If that encounters CORS or network error,
 * falls back to querying ML status via backend proxy (/ml/model-info).
 */
export const getMlHealth = async () => {
  if (ML_URL) {
    try {
      const directRes = await axios.get(`${ML_URL}/health`, { timeout: 8000 });
      return directRes;
    } catch (err) {
      console.warn('Direct ML health check failed, falling back to backend:', err?.message);
    }
  }
  return api.get('/ml/model-info');
};

