import api from './axios';
import axios from 'axios';

const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000';

/**
 * Check backend health.
 */
export const getBackendHealth = () => api.get('/health');

/**
 * Check ML service health.
 * Uses raw axios since ML service is a separate origin.
 */
export const getMlHealth = () => axios.get(`${ML_URL}/health`);
