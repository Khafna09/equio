import { createContext, useContext } from 'react';
import type { AuthResponse, AuthUser } from '../types/auth.types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logoutPending: boolean;
  login: (data: AuthResponse) => void;
  logout: () => Promise<void>;
  updateUser: (partialUser: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
