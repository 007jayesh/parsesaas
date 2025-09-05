'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, type User, type LoginResponse } from '@/services/api';

// User interface is now imported from api service

interface UserContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithUser: (userData: User) => void;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  useCredit: () => boolean;
  addCredits: (amount: number) => void;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load user from token on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Only run on client
    
    const token = localStorage.getItem('access_token');
    if (token) {
      // Try to get current user info
      apiService.getCurrentUser().then(({ data, error }) => {
        if (data) {
          setUser(data);
          setIsLoggedIn(true);
        } else if (error) {
          // For any error (including token expiration), clear the invalid token
          // but user can log in again with the same credentials
          localStorage.removeItem('access_token');
          setUser(null);
          setIsLoggedIn(false);
        }
      });
    }
  }, []);

  // No need to save user to localStorage - token is enough

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await apiService.login(email, password);
    
    if (data) {
      setUser(data.user);
      setIsLoggedIn(true);
      return true;
    }
    
    return false;
  };

  const loginWithUser = (userData: any): void => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    const { data, error } = await apiService.register(name, email, password);
    
    if (data) {
      setUser(data.user);
      setIsLoggedIn(true);
      return true;
    }
    
    console.error('Registration failed:', error);
    return false;
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setIsLoggedIn(false);
  };

  const useCredit = (): boolean => {
    if (!user || user.credits <= 0) {
      return false;
    }
    
    const updatedUser = {
      ...user,
      credits: user.credits - 1
    };
    setUser(updatedUser);
    return true;
  };

  const addCredits = (amount: number) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      credits: user.credits + amount
    };
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    const { data, error } = await apiService.getCurrentUser();
    if (data) {
      setUser(data);
    } else if (error === 'Token expired') {
      // Keep user logged in for 7 days - only clear on explicit logout
      console.warn('Token expired after 7 days. User stays logged in until manual logout.');
    }
  };

  const value: UserContextType = {
    user,
    isLoggedIn,
    login,
    loginWithUser,
    register,
    logout,
    useCredit,
    addCredits,
    refreshUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}