import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import {
  clearStoredAuthToken,
  getKeepSignedInPreference,
  getStoredAuthToken,
  persistAuthToken,
} from '../utils/preferences';

const parseApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = await response.json();

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      const firstMessage = payload.errors[0]?.message;
      if (typeof firstMessage === 'string' && firstMessage.trim().length > 0) {
        return firstMessage;
      }
    }

    if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // Ignore malformed/non-JSON error payloads and fall back to a generic message.
  }

  return fallbackMessage;
};

const decodeJwtExpiry = (tokenValue: string) => {
  try {
    const [, payload] = tokenValue.split('.');
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isExpiredToken = (tokenValue: string) => {
  const expiryMs = decodeJwtExpiry(tokenValue);
  return expiryMs !== null && expiryMs <= Date.now();
};

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from persisted storage on mount
  useEffect(() => {
    const storedToken = getStoredAuthToken();
    if (storedToken) {
      if (isExpiredToken(storedToken)) {
        clearStoredAuthToken();
        setIsLoading(false);
        return;
      }
      setToken(storedToken);
      // Verify token and load user info
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      // Clear invalid token
      clearStoredAuthToken();
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, 'Login failed');
        throw new Error(message);
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      persistAuthToken(data.token, getKeepSignedInPreference());
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const message = await parseApiError(response, 'Signup failed');
        throw new Error(message);
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      persistAuthToken(data.token, getKeepSignedInPreference());
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearStoredAuthToken();
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
