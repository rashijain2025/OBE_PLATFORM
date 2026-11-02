import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, getMeApi, googleLoginApi, switchRoleApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check current token
  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await getMeApi();
      if (response.success && response.data) {
        setUser(response.data);
        setToken(storedToken);
      } else {
        throw new Error('Failed to load user profile');
      }
    } catch (err) {
      console.warn('Session expired or invalid token:', err?.response?.data?.message || err.message);
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Login user with credentials
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await loginApi({ email, password });
      if (response.success && response.data) {
        const { user: userData, token: jwtToken } = response.data;
        localStorage.setItem('token', jwtToken);
        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Login user with verified Google credential / idToken
   */
  const loginWithGoogle = async (idToken) => {
    setError(null);
    try {
      const response = await googleLoginApi({ idToken });
      if (response.success && response.data) {
        const { user: userData, token: jwtToken } = response.data;
        localStorage.setItem('token', jwtToken);
        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      throw new Error(response.message || 'Google login failed');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google login failed';
      setError(msg);
      return { success: false, error: msg, status: err.response?.status };
    }
  };

  /**
   * Switch active role for multi-role user
   */
  const switchRole = async (targetRole) => {
    setError(null);
    try {
      const response = await switchRoleApi({ role: targetRole });
      if (response.success && response.data) {
        const { user: userData, token: jwtToken } = response.data;
        localStorage.setItem('token', jwtToken);
        setToken(jwtToken);
        setUser(userData);
        return { success: true, user: userData };
      }
      throw new Error(response.message || 'Failed to switch role');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to switch role';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Logout user and clear tokens
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    loginWithGoogle,
    switchRole,
    logout,
    refreshUser: loadUser,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
