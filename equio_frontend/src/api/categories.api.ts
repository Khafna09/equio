import apiClient from './apiClient';
import type { CategoryRequest, CategoryResponse } from '../types/category.types';

export const categoriesApi = {
  getAll: async () => {
    const response = await apiClient.get<CategoryResponse[]>('/categories');
    return response.data;
  },

  create: async (data: CategoryRequest) => {
    const response = await apiClient.post<CategoryResponse>('/categories', data);
    return response.data;
  },

  update: async (id: number, data: CategoryRequest) => {
    const response = await apiClient.put<CategoryResponse>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/categories/${id}`);
  }
};
