import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import i18n from '../i18n/index.js';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'fuel_manager_token';
const USER_KEY = 'fuel_manager_user';
const SA_TOKEN_KEY = 'fuel_manager_sa_token';
const SA_USER_KEY = 'fuel_manager_sa_user';

// Configure axios defaults
axios.defaults.baseURL = '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set axios authorization header
  const setAxiosAuth = useCallback((t) => {
    if (t) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setAxiosAuth(storedToken);

        // Sync language from user preference
        if (parsedUser.language) {
          i18n.changeLanguage(parsedUser.language);
        }
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setLoading(false);
  }, [setAxiosAuth]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    setAxiosAuth(newToken);

    // Sync language
    if (newUser.language) {
      i18n.changeLanguage(newUser.language);
    }

    return newUser;
  }, [setAxiosAuth]);

  const register = useCallback(async (data) => {
    const response = await axios.post('/auth/register', data);
    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    setAxiosAuth(newToken);

    return newUser;
  }, [setAxiosAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setAxiosAuth(null);
  }, [setAxiosAuth]);

  const loginWithToken = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setAxiosAuth(newToken);
    if (newUser.language) {
      i18n.changeLanguage(newUser.language);
    }
  }, [setAxiosAuth]);

  const impersonate = useCallback(async (companyId, companyName) => {
    const response = await axios.post(`/companies/${companyId}/impersonate`);
    const { token: newToken } = response.data;

    // Salva token superadmin originale
    localStorage.setItem(SA_TOKEN_KEY, token);
    localStorage.setItem(SA_USER_KEY, JSON.stringify(user));

    const impersonatedUser = {
      ...user,
      role: 'admin',
      company_id: companyId,
      company_name: companyName,
      is_impersonating: true,
    };

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(impersonatedUser));
    setToken(newToken);
    setUser(impersonatedUser);
    setAxiosAuth(newToken);
  }, [token, user, setAxiosAuth]);

  const exitImpersonation = useCallback(() => {
    const savedToken = localStorage.getItem(SA_TOKEN_KEY);
    const savedUser = localStorage.getItem(SA_USER_KEY);
    if (!savedToken || !savedUser) return;

    localStorage.removeItem(SA_TOKEN_KEY);
    localStorage.removeItem(SA_USER_KEY);

    const parsedUser = JSON.parse(savedUser);
    localStorage.setItem(TOKEN_KEY, savedToken);
    localStorage.setItem(USER_KEY, savedUser);
    setToken(savedToken);
    setUser(parsedUser);
    setAxiosAuth(savedToken);
  }, [setAxiosAuth]);

  const updateUser = useCallback((updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem(USER_KEY, JSON.stringify(merged));

    if (updatedUser.language) {
      i18n.changeLanguage(updatedUser.language);
    }
  }, [user]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    role: user?.role || null,
    companyId: user?.company_id || null,
    isImpersonating: !!user?.is_impersonating,
    login,
    loginWithToken,
    register,
    logout,
    updateUser,
    impersonate,
    exitImpersonation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
