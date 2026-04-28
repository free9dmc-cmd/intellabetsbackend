import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const data = await api.me();
        setUser(data.user);
      }
    } catch {
      await AsyncStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    await AsyncStorage.setItem('authToken', data.token);
    setUser(data.user);
    return data;
  }

  async function register(email, password, name) {
    const data = await api.register(email, password, name);
    await AsyncStorage.setItem('authToken', data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    await AsyncStorage.removeItem('authToken');
    setUser(null);
  }

  async function refreshUser() {
    try {
      const data = await api.me();
      setUser(data.user);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
