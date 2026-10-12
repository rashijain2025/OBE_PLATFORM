import api from './axios';

/**
 * Authenticate user
 * @param {Object} credentials - { email, password }
 */
export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Get current authenticated user profile
 */
export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Register a new user (Admin only)
 * @param {Object} userData - { name, email, password, role, department, rollNo }
 */
export const registerUserApi = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};
