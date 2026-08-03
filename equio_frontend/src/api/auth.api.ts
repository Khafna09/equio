import apiClient from './apiClient';
import type { SignInRequest, SignUpRequest, JwtResponse } from '../types/auth.types';

export const authApi = {
  signIn: async (data: SignInRequest) => {
    const response = await apiClient.post<JwtResponse>('/auth/sign-in', data);
    return response.data;
  },

  signUp: async (data: SignUpRequest) => {
    const response = await apiClient.post<any>('/auth/sign-up', data);
    return response.data;
  },
};
