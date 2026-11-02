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

/**
 * Google OAuth authentication
 * @param {Object} payload - { idToken }
 */
export const googleLoginApi = async (payload) => {
  const response = await api.post('/auth/google', payload);
  return response.data;
};

/**
 * Switch active role for multi-role user
 * @param {Object} payload - { role }
 */
export const switchRoleApi = async (payload) => {
  const response = await api.post('/auth/switch-role', payload);
  return response.data;
};
