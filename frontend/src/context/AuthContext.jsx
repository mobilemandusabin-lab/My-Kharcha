import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (e) {
      setUser(null);
      localStorage.removeItem('mk_token');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMe(); }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) { localStorage.setItem('mk_token', data.token); setAuthToken(data.token); }
    setUser(data.user);
    return data;
  }

  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    if (data.token) { localStorage.setItem('mk_token', data.token); setAuthToken(data.token); }
    setUser(data.user);
    return data;
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('mk_token');
    setAuthToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, reload: loadMe }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
