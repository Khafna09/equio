import apiClient from './apiClient';
import type { CreateMovementRequest, MovementCursor, MovementFilters, MovementPage, MovementResponse } from '../types/movement.types';

export const movementsApi = {
  getPage: async (filters?: MovementFilters, cursor?: MovementCursor | null, size = 50, signal?: AbortSignal) => {
    const response = await apiClient.get<MovementPage>('/movements/page', {
      params: { ...filters, ...cursor, size }, signal,
    });
    return response.data;
  },

  getDates: async (startDate: string, endDate: string, signal?: AbortSignal) => {
    const response = await apiClient.get<string[]>('/movements/dates', { params: { startDate, endDate }, signal });
    return response.data;
  },

  getAll: async (filters?: MovementFilters) => {
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
