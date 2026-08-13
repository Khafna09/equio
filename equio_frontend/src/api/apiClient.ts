import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types/auth.types';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './tokenStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api/v1';

const clientOptions = {
  baseURL,
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
};

let refreshPromise: Promise<AuthResponse> | null = null;
let restorePromise: Promise<AuthResponse | null> | null = null;

async function ensureCsrfToken(): Promise<void> {
  await sessionClient.get('/auth/csrf');
}

async function requestRefresh(): Promise<AuthResponse> {
  await ensureCsrfToken();
  const response = await sessionClient.post<AuthResponse>('/auth/refresh');
  setAccessToken(response.data.accessToken);
  return response.data;
}

export function refreshSession(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function restoreSession(): Promise<AuthResponse | null> {
  if (!restorePromise) {
    restorePromise = refreshSession().catch(() => {
      clearAccessToken();
      return null;
    });
  }
  return restorePromise;
}

export async function closeSession(): Promise<void> {
  try {
    await ensureCsrfToken();
    await sessionClient.post('/auth/logout');
  } finally {
    clearAccessToken();
    restorePromise = null;
  }
}

export async function prepareCsrfToken(): Promise<void> {
  await ensureCsrfToken();
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const isAuthenticationEndpoint = config?.url?.includes('/auth/');

    if (error.response?.status === 401 && config && !config._retry && !isAuthenticationEndpoint) {
      config._retry = true;
      try {
        const session = await refreshSession();
        config.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient(config);
      } catch {
        clearAccessToken();
        window.dispatchEvent(new Event('equio:auth-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
