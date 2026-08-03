import apiClient from './apiClient';
import type { CreateMovementRequest, MovementResponse } from '../types/movement.types';

export const movementsApi = {
  getAll: async (filters?: { type?: string; categoryId?: number; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<MovementResponse[]>('/movements', { params: filters });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<MovementResponse>(`/movements/${id}`);
    return response.data;
  },

  create: async (data: CreateMovementRequest) => {
    const response = await apiClient.post<MovementResponse>('/movements', data);
    return response.data;
  },

  update: async (id: number, data: CreateMovementRequest) => {
    const response = await apiClient.put<MovementResponse>(`/movements/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/movements/${id}`);
  }
};
