import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.api';
import { clearAccessToken, setAccessToken } from '../api/tokenStore';
import type { AuthResponse, AuthUser } from '../types/auth.types';
import { AuthContext } from './authContextValue';
import { removeLocalStorageItem } from '../utils/browserStorage';

function toUser(session: AuthResponse): AuthUser {
  return {
    id: session.id,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    language: session.language,
    currency: session.currency,
    roles: session.roles,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    removeLocalStorageItem('token');
    removeLocalStorageItem('user');

    let active = true;
    void authApi.restoreSession().then((session) => {
      if (!active) return;
      if (session) {
        setAccessToken(session.accessToken);
        setUser(toUser(session));
      }
      setIsLoading(false);
    });

    const handleExpiredSession = () => {
      clearAccessToken();
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('equio:auth-expired', handleExpiredSession);
    return () => {
      active = false;
      window.removeEventListener('equio:auth-expired', handleExpiredSession);
    };
  }, []);

  const login = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setUser(toUser(session));
    void authApi.prepareCsrfToken();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.closeSession();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((partialUser: Partial<AuthUser>) => {
    setUser((current) => current ? { ...current, ...partialUser } : null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
