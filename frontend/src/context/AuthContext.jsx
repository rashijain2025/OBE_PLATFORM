import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider — manages authentication state across the app.
 *
 * - Stores user + token in both React state and localStorage
 * - login() calls POST /api/auth/login (real API)
 * - register() calls POST /api/auth/register (real API)
 * - logout() clears everything
 * - On mount, rehydrates from localStorage
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Rehydrate auth state from localStorage on mount ───────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('obe_token');
    const storedUser = localStorage.getItem('obe_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem('obe_token');
        localStorage.removeItem('obe_user');
      }
    }
    setLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { token: jwt, data: userData } = response.data;

    localStorage.setItem('obe_token', jwt);
    localStorage.setItem('obe_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);

    return response.data;
  }, []);

  // ── Register ──────────────────────────────────────────────────────
  const register = useCallback(async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('obe_token');
    localStorage.removeItem('obe_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token;

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
