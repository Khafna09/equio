import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types/auth.types';
import {
  clearLogoutPending, isLogoutPending, markLogoutPending,
  notifySessionPeers, requireConfirmedLogout, withSessionLock,
} from './sessionCoordinator';
import {
  clearAccessToken,
  getAccessToken,
  getSessionVersion,
  onSessionChange,
  setAccessToken,
} from './tokenStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api/v1';

const clientOptions = {
  baseURL,
  timeout: 15_000,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Content-Type': 'application/json',
  },
};

const apiClient = axios.create(clientOptions);
const sessionClient = axios.create(clientOptions);

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _sessionVersion?: number;
};

let refreshPromise: Promise<AuthResponse> | null = null;
let restorePromise: Promise<AuthResponse | null> | null = null;
let csrfToken: string | null = null;
let sessionController = new AbortController();

onSessionChange(() => {
  sessionController.abort();
  sessionController = new AbortController();
  refreshPromise = null;
  restorePromise = null;
  csrfToken = null;
});

async function ensureCsrfToken(): Promise<void> {
  const version = getSessionVersion();
  // Complete cookie responses while holding the lock; aborting fetch does not roll back the server.
  const response = await sessionClient.get<{ token: string }>('/auth/csrf');
  if (version !== getSessionVersion()) throw new axios.CanceledError('Session changed');
  if (!response.data.token) {
    throw new Error('The CSRF endpoint did not return a token');
  }
  csrfToken = response.data.token;
}

async function requestRefresh(): Promise<AuthResponse> {
  const version = getSessionVersion();
  await ensureCsrfToken();
  if (version !== getSessionVersion()) throw new axios.CanceledError('Session changed');
  requireConfirmedLogout();
  const response = await sessionClient.post<AuthResponse>(
    '/auth/refresh',
    undefined,
    { headers: { 'X-XSRF-TOKEN': csrfToken } },
  );
  if (version !== getSessionVersion()) throw new axios.CanceledError('Session changed');
  requireConfirmedLogout();
  setAccessToken(response.data.accessToken);
  return response.data;
}

export function refreshSession(): Promise<AuthResponse> {
  if (!refreshPromise) {
    const version = getSessionVersion();
    const pending = withSessionLock(() => {
      if (version !== getSessionVersion()) throw new axios.CanceledError('Session changed');
      requireConfirmedLogout();
      return requestRefresh();
    }, sessionController.signal).finally(() => {
      if (refreshPromise === pending) refreshPromise = null;
    });
    refreshPromise = pending;
  }
  return refreshPromise;
}

export function restoreSession(): Promise<AuthResponse | null> {
  if (!restorePromise) {
    const version = getSessionVersion();
    const restoring = isLogoutPending()
      ? closeSession().then(() => null)
      : refreshSession();
    restorePromise = restoring.catch(() => {
      if (version === getSessionVersion()) clearAccessToken();
      return null;
    });
  }
  return restorePromise;
}

export async function closeSession(): Promise<void> {
  const version = getSessionVersion();
  markLogoutPending();
  notifySessionPeers('logout');
  try {
    await withSessionLock(async () => {
      if (version !== getSessionVersion()) throw new axios.CanceledError('Session changed');
      await ensureCsrfToken();
      if (version !== getSessionVersion()) throw new axios.CanceledError('Session changed');
      await sessionClient.post('/auth/logout', undefined,
        { headers: { 'X-XSRF-TOKEN': csrfToken } });
      clearLogoutPending();
      notifySessionPeers('logout');
    }, sessionController.signal);
  } finally {
    if (version === getSessionVersion()) {
      clearAccessToken();
      csrfToken = null;
      restorePromise = null;
    }
  }
}

export async function prepareCsrfToken(): Promise<void> {
  await ensureCsrfToken();
}

apiClient.interceptors.request.use((config) => {
  const sessionConfig = config as RetryableConfig;
  if (sessionConfig._sessionVersion !== undefined
      && sessionConfig._sessionVersion !== getSessionVersion()) {
    throw new axios.CanceledError('Session changed');
  }
  sessionConfig._sessionVersion = getSessionVersion();
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    config.headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return config;
}, (error) => { throw error; }, { synchronous: true });

apiClient.interceptors.response.use(
  (response) => {
    if ((response.config as RetryableConfig)._sessionVersion !== getSessionVersion()) {
      throw new axios.CanceledError('Session changed');
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    if (config?._sessionVersion !== undefined && config._sessionVersion !== getSessionVersion()) {
      return Promise.reject(new axios.CanceledError('Session changed'));
    }
    const isAuthenticationEndpoint = config?.url?.includes('/auth/');

    if (error.response?.status === 401 && config && !config._retry && !isAuthenticationEndpoint) {
      config._retry = true;
      try {
        const session = await refreshSession();
        config.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient(config);
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401
            && config._sessionVersion === getSessionVersion()) {
          clearAccessToken();
          window.dispatchEvent(new Event('equio:auth-expired'));
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
