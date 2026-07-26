'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithPhone: (phone: string, code?: string) => Promise<void>;
  logout: () => void;
  switchUser: (targetUser: User) => Promise<void>;
  updateUser: (user: User) => void;
  allDemoUsers: User[];
  fetchDemoUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allDemoUsers, setAllDemoUsers] = useState<User[]>([]);

  const fetchDemoUsers = async () => {
    try {
      const users = await api.getAllUsers();
      setAllDemoUsers(users);
    } catch (e) {
      console.error('Failed to fetch demo users', e);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('signal_token');
    if (savedToken) {
      setToken(savedToken);
      api.getMe(savedToken)
        .then((u) => {
          setUser(u);
          wsClient.connect(savedToken);
        })
        .catch(() => {
          loginWithPhone('+919876543210', '123456').catch(() => {});
        })
        .finally(() => setLoading(false));
    } else {
      loginWithPhone('+919876543210', '123456')
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    fetchDemoUsers();
  }, []);

  const loginWithPhone = async (phone: string, code: string = '123456') => {
    setLoading(true);
    try {
      localStorage.removeItem('signal_token');
      const res = await api.phoneLogin(phone, code);
      if (!res || !res.access_token || !res.user) {
        throw new Error('Invalid response from authentication server');
      }
      localStorage.setItem('signal_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      wsClient.connect(res.access_token);
    } catch (err) {
      localStorage.removeItem('signal_token');
      setToken(null);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    wsClient.disconnect();
    localStorage.removeItem('signal_token');
    setToken(null);
    setUser(null);
  };

  const switchUser = async (targetUser: User) => {
    setLoading(true);
    try {
      await loginWithPhone(targetUser.phone, '123456');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithPhone,
        logout,
        switchUser,
        updateUser,
        allDemoUsers,
        fetchDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
