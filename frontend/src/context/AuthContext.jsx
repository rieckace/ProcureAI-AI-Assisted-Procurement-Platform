import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to determine which storage to use
  function getStorage(rememberMe) {
    return rememberMe !== false ? localStorage : sessionStorage;
  }

  useEffect(() => {
    // Check localStorage first, then sessionStorage
    let token = localStorage.getItem('token');
    let savedUser = localStorage.getItem('user');
    if (!token || !savedUser) {
      token = sessionStorage.getItem('token');
      savedUser = sessionStorage.getItem('user');
    }
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, organizationSlug, rememberMe = true) => {
    const response = await api.post('/auth/login', { email, password, organizationSlug });
    const { token, user: userData } = response.data;
    const storage = getStorage(rememberMe);
    storage.setItem('token', token);
    storage.setItem('user', JSON.stringify(userData));
    // Clear the other storage to avoid stale data
    const otherStorage = rememberMe !== false ? sessionStorage : localStorage;
    otherStorage.removeItem('token');
    otherStorage.removeItem('user');
    setUser(userData);
    return userData;
  };

  /**
   * Register creates a new organization with the user as org admin
   */
  const register = async (name, email, password, role, organizationName, organizationSlug) => {
    const response = await api.post('/auth/register', {
      name, email, password, role,
      organizationName: organizationName || `${name}'s Organization`,
      organizationSlug
    });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const acceptInvite = async (name, password, token) => {
    const res = await api.post(`/auth/accept-invite/${token}`, { name, password });
    const { token: jwt, user: userData } = res.data;
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, acceptInvite, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
