import apiClient, {
  closeSession,
  prepareCsrfToken,
  restoreSession,
} from './apiClient';
import type {
  AuthResponse,
  AuthUser,
  SignInRequest,
  SignUpRequest,
} from '../types/auth.types';

export const authApi = {
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    await prepareCsrfToken();
    const response = await apiClient.post<AuthResponse>('/auth/sign-in', data);
    return response.data;
  },

  async signUp(data: SignUpRequest): Promise<AuthUser> {
    await prepareCsrfToken();
    const response = await apiClient.post<AuthUser>('/auth/sign-up', data);
    return response.data;
  },

  restoreSession,
  closeSession,
  prepareCsrfToken,
};
