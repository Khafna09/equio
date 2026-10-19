import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse } from 'axios';
import apiClient from './apiClient';
import { advanceSession, getAccessToken, setAccessToken } from './tokenStore';

describe('session request isolation', () => {
  const originalAdapter = apiClient.defaults.adapter;
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    advanceSession();
    vi.unstubAllGlobals();
  });

  it('discards a previous account response after a session change', async () => {
    advanceSession();
    setAccessToken('account-a');
    let finish!: () => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    apiClient.defaults.adapter = (config) => new Promise<AxiosResponse>((resolve) => {
      finish = () => resolve({ data: { private: 'A' }, status: 200, statusText: 'OK', headers: {}, config });
      started();
    });
    const request = apiClient.get('/profile');
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await ready;
    advanceSession();
    setAccessToken('account-b');
    finish();
    await rejected;
    expect(getAccessToken()).toBe('account-b');
  });

  it('captures the account at dispatch rather than at the next microtask', async () => {
    advanceSession();
    setAccessToken('account-a');
    let authorization: unknown;
    apiClient.defaults.adapter = async (config) => {
      authorization = config.headers.Authorization;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    const request = apiClient.get('/profile');
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    advanceSession();
    setAccessToken('account-b');
    await rejected;
    expect(authorization).toBe('Bearer account-a');
  });
});
