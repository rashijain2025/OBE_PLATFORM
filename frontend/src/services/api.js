import axios from 'axios';

/**
 * Axios instance pre-configured for the OBE Platform API.
 *
 * - baseURL defaults to VITE_API_URL env var (set in docker-compose)
 *   or falls back to http://localhost:5000 for local dev.
 * - Request interceptor attaches JWT from localStorage if present.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach auth token ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('obe_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid — clear stored auth
      localStorage.removeItem('obe_token');
      localStorage.removeItem('obe_user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
