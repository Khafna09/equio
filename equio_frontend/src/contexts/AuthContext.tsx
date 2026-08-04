import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { JwtResponse } from '../types/auth.types';

interface AuthContextType {
  user: JwtResponse | null;
  isAuthenticated: boolean;
  login: (data: JwtResponse) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<JwtResponse>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtResponse | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');

    if (token && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = useCallback((data: JwtResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((partialUser: Partial<JwtResponse>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
