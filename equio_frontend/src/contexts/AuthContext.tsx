import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.api';
import { advanceSession, getSessionVersion, setAccessToken } from '../api/tokenStore';
import type { AuthResponse, AuthUser } from '../types/auth.types';
import { AuthContext } from './authContextValue';
import { removeLocalStorageItem } from '../utils/browserStorage';
import { useQueryClient } from '@tanstack/react-query';
import { clearSessionCache } from '../api/queryCache';
import { isLogoutPending, notifySessionPeers, onPeerSessionChange } from '../api/sessionCoordinator';

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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoutPending, setLogoutPending] = useState(isLogoutPending);

  useEffect(() => {
    removeLocalStorageItem('token');
    removeLocalStorageItem('user');

    let active = true;
    const restore = () => {
      const sessionVersion = getSessionVersion();
      void authApi.restoreSession().then((session) => {
        if (!active || sessionVersion !== getSessionVersion()) return;
        if (session) {
          setAccessToken(session.accessToken);
          setUser(toUser(session));
        }
        setLogoutPending(isLogoutPending());
        setIsLoading(false);
      });
    };
    restore();

    const handleExpiredSession = () => {
      clearSessionCache(queryClient);
      advanceSession();
      setUser(null);
      setIsLoading(false);
      notifySessionPeers('logout');
    };
    const unsubscribe = onPeerSessionChange((notice) => {
      clearSessionCache(queryClient);
      advanceSession();
      setUser(null);
      setIsLoading(notice === 'changed');
      setLogoutPending(isLogoutPending());
      if (notice === 'changed') restore();
    });
    window.addEventListener('equio:auth-expired', handleExpiredSession);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('equio:auth-expired', handleExpiredSession);
    };
  }, [queryClient]);

  const login = useCallback((session: AuthResponse) => {
    clearSessionCache(queryClient);
    advanceSession();
    setAccessToken(session.accessToken);
    setUser(toUser(session));
    setLogoutPending(false);
    setIsLoading(false);
  }, [queryClient]);

  const logout = useCallback(async () => {
    clearSessionCache(queryClient);
    advanceSession();
    setUser(null);
    setIsLoading(false);
    setLogoutPending(true);
    try {
      await authApi.closeSession();
    } finally {
      setLogoutPending(isLogoutPending());
    }
  }, [queryClient]);

  const updateUser = useCallback((partialUser: Partial<AuthUser>) => {
    setUser((current) => current ? { ...current, ...partialUser } : null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        logoutPending,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
