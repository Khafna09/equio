import apiClient, {
  closeSession,
  prepareCsrfToken,
  restoreSession,
} from './apiClient';
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
} from '../types/auth.types';
import { notifySessionPeers, requireConfirmedLogout, withSessionLock } from './sessionCoordinator';
import { getSessionVersion } from './tokenStore';
import { CanceledError } from 'axios';

export const authApi = {
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const version = getSessionVersion();
    return withSessionLock(async () => {
      if (version !== getSessionVersion()) throw new CanceledError('Session changed');
      requireConfirmedLogout();
      await prepareCsrfToken();
      if (version !== getSessionVersion()) throw new CanceledError('Session changed');
      requireConfirmedLogout();
      const response = await apiClient.post<AuthResponse>('/auth/sign-in', data);
      requireConfirmedLogout();
      notifySessionPeers('changed');
      return response.data;
    });
  },

  async signUp(data: SignUpRequest): Promise<void> {
    const version = getSessionVersion();
    await withSessionLock(async () => {
      if (version !== getSessionVersion()) throw new CanceledError('Session changed');
      requireConfirmedLogout();
      await prepareCsrfToken();
      if (version !== getSessionVersion()) throw new CanceledError('Session changed');
      requireConfirmedLogout();
      await apiClient.post('/auth/sign-up', data);
    });
  },

  restoreSession,
  closeSession,
  prepareCsrfToken,
};
