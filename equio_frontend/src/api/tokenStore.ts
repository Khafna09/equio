let accessToken: string | null = null;
let sessionVersion = 0;
const sessionListeners = new Set<() => void>();

export function onSessionChange(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}

export function getSessionVersion(): number {
  return sessionVersion;
}

export function advanceSession(): void {
  sessionVersion += 1;
  accessToken = null;
  sessionListeners.forEach((listener) => listener());
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
