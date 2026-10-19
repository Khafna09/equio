import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from '../utils/browserStorage';

type SessionNotice = 'changed' | 'logout';
const LOGOUT_PENDING_KEY = 'equio.logout.pending';
let pendingWithoutStorage = false;
const listeners = new Set<(notice: SessionNotice) => void>();
const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('equio-session-v1') : null;

if (channel) {
  channel.onmessage = ({ data }: MessageEvent<unknown>) => {
    if (!data || typeof data !== 'object' || !('type' in data)) return;
    if (data.type !== 'changed' && data.type !== 'logout') return;
    listeners.forEach((listener) => listener(data.type as SessionNotice));
  };
}

export function notifySessionPeers(type: SessionNotice): void {
  channel?.postMessage({ type });
}

export function onPeerSessionChange(listener: (notice: SessionNotice) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isLogoutPending(): boolean {
  return pendingWithoutStorage || getLocalStorageItem(LOGOUT_PENDING_KEY) === 'true';
}

export function markLogoutPending(): void {
  // Persist only intent, never a token or account data, when revocation cannot reach the API.
  pendingWithoutStorage = !setLocalStorageItem(LOGOUT_PENDING_KEY, 'true');
}

export function clearLogoutPending(): void {
  pendingWithoutStorage = false;
  removeLocalStorageItem(LOGOUT_PENDING_KEY);
}

export function requireConfirmedLogout(): void {
  if (isLogoutPending()) {
    throw Object.assign(new Error('The previous logout has not been confirmed.'), { code: 'SESSION_LOGOUT_PENDING' });
  }
}

export async function withSessionLock<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  // Cookies are shared between tabs, unlike each tab's in-memory access token.
  if (typeof window === 'undefined') return operation();
  if (!navigator.locks || !channel) {
    throw Object.assign(new Error('This browser cannot safely synchronize sessions.'), { code: 'SESSION_SYNC_UNAVAILABLE' });
  }
  const deadline = AbortSignal.timeout(10_000);
  return navigator.locks.request('equio-auth-cookie-v1', {
    mode: 'exclusive', signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  }, operation);
}

if (import.meta.hot) import.meta.hot.dispose(() => channel?.close());
