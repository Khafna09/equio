import { afterEach, describe, expect, it, vi } from 'vitest';

describe('browser session coordination', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('uses one exclusive browser lock for cookie operations and sends no credentials', async () => {
    const posted: unknown[] = [];
    let handler: ((event: { data: unknown }) => void) | undefined;
    vi.stubGlobal('window', {});
    vi.stubGlobal('BroadcastChannel', class {
      set onmessage(value: typeof handler) { handler = value; }
      postMessage(value: unknown) { posted.push(value); }
      close() {}
    });
    const request = vi.fn(async (_name, _options, callback: () => Promise<string>) => callback());
    vi.stubGlobal('navigator', { locks: { request } });
    const coordinator = await import('./sessionCoordinator');
    expect(await coordinator.withSessionLock(async () => 'done')).toBe('done');
    expect(request).toHaveBeenCalledWith('equio-auth-cookie-v1', expect.objectContaining({ mode: 'exclusive' }), expect.any(Function));
    const received = vi.fn();
    const unsubscribe = coordinator.onPeerSessionChange(received);
    handler?.({ data: { type: 'changed' } });
    handler?.({ data: { type: 'unknown', accessToken: 'untrusted' } });
    coordinator.notifySessionPeers('logout');
    expect(received).toHaveBeenCalledExactlyOnceWith('changed');
    expect(posted).toEqual([{ type: 'logout' }]);
    unsubscribe();
  });

  it('does not silently perform concurrent rotations without Web Locks', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    const coordinator = await import('./sessionCoordinator');
    const operation = vi.fn();
    await expect(coordinator.withSessionLock(operation)).rejects.toThrow('synchronize sessions');
    expect(operation).not.toHaveBeenCalled();
  });

  it('persists only pending logout intent across reloads and clears it after confirmation', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    } });
    vi.stubGlobal('BroadcastChannel', undefined);
    const coordinator = await import('./sessionCoordinator');
    coordinator.markLogoutPending();
    expect([...values.entries()]).toEqual([['equio.logout.pending', 'true']]);
    expect(() => coordinator.requireConfirmedLogout()).toThrow('not been confirmed');
    vi.resetModules();
    const reloaded = await import('./sessionCoordinator');
    expect(reloaded.isLogoutPending()).toBe(true);
    reloaded.clearLogoutPending();
    expect(coordinator.isLogoutPending()).toBe(false);
    expect(() => reloaded.requireConfirmedLogout()).not.toThrow();
  });

  it('keeps pending intent in memory when browser storage is blocked', async () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('Storage blocked'); } });
    vi.stubGlobal('BroadcastChannel', undefined);
    const coordinator = await import('./sessionCoordinator');
    coordinator.markLogoutPending();
    expect(coordinator.isLogoutPending()).toBe(true);
    coordinator.clearLogoutPending();
    expect(coordinator.isLogoutPending()).toBe(false);
  });
});
