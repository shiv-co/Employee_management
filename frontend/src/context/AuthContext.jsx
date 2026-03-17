import { createContext, useContext, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const getInitialAuthState = () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated: Boolean(accessToken && user)
  };
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getInitialAuthState);

  const persistAuth = ({ accessToken, refreshToken, user }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    setAuthState({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true
    });
  };

  const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState((prev) => ({ ...prev, user }));
  };

  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setAuthState({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  };

  const login = async (email, password) => {
    const response = await api.post('/v1/auth/login', { email, password });
    const payload = response.data?.data;
    persistAuth(payload);
    return payload;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/v1/auth/logout', { refreshToken });
      }
    } catch (_error) {
      // Ignore logout errors and clear client session.
    }
    clearAuth();
  };

  const value = useMemo(
    () => ({ ...authState, login, logout, clearAuth, setUser }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
