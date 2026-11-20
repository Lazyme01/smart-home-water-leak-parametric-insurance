import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('aquashield_token')));
  useEffect(() => {
    const reset = () => { setUser(null); setLoading(false); };
    window.addEventListener('aquashield:logout', reset);
    if (localStorage.getItem('aquashield_token')) {
      api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(reset).finally(() => setLoading(false));
    }
    return () => window.removeEventListener('aquashield:logout', reset);
  }, []);
  const value = useMemo(() => ({
    user, loading,
    login: async values => {
      const { data } = await api.post('/auth/login', values);
      localStorage.setItem('aquashield_token', data.token); setUser(data.user); return data.user;
    },
    register: async values => {
      const { data } = await api.post('/auth/register', values);
      localStorage.setItem('aquashield_token', data.token); setUser(data.user); return data.user;
    },
    logout: async () => {
      try { await api.post('/auth/logout'); } finally { localStorage.removeItem('aquashield_token'); setUser(null); }
    },
    updateUser: setUser
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
