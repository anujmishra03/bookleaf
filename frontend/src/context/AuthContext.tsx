'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { disconnectSocket, getSocket } from '@/lib/socket';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'AUTHOR' | 'ADMIN';
  phone?: string | null;
  bankAccountLinked: boolean;
  bankAccountDetails?: {
    bankName: string;
    accountNumberLast4: string;
    ifsc: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchCurrentUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('bookleaf_token');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password = 'password123') => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.success && res.data) {
        localStorage.setItem('bookleaf_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        getSocket(); // Reconnect real-time socket with new credentials

        if (res.data.user.role === 'ADMIN') {
          router.push('/admin/tickets');
        } else {
          router.push('/author/dashboard');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bookleaf_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
    router.push('/login');
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
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
