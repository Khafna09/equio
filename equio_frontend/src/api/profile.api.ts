import apiClient from './apiClient';

export interface ProfileResponse {
  id: number;
  firstName: string;
  lastName: string;
  language: string;
  currency: string;
  theme: string;
  timeFormat: '12' | '24';
  budgetMode: 'NORMAL' | 'ADVANCED';
}

export interface ProfileRequest {
  firstName?: string;
  lastName?: string;
  language?: 'es' | 'en';
  currency?: string;
  theme?: 'light' | 'dark' | 'system';
  timeFormat?: '12' | '24';
}

export const profileApi = {
  getMyProfile: async () => {
    const response = await apiClient.get<ProfileResponse>('/profiles/me');
    return response.data;
  },

  updateMyProfile: async (data: ProfileRequest) => {
    const response = await apiClient.put<ProfileResponse>('/profiles/me', data);
    return response.data;
  }
};
