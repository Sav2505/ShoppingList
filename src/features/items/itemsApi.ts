import axios from 'axios';
import type { NewItemPayload, ShoppingItem } from '@/types/item';

const api = axios.create({ baseURL: '/items' });

export const itemsApi = {
  getAll: async (): Promise<ShoppingItem[]> => {
    const { data } = await api.get<ShoppingItem[]>('/');
    return data;
  },

  create: async (payload: NewItemPayload): Promise<ShoppingItem> => {
    const newItem: Omit<ShoppingItem, 'id'> = {
      ...payload,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    const { data } = await api.post<ShoppingItem>('/', newItem);
    return data;
  },

  update: async (id: number, patch: Partial<ShoppingItem>): Promise<ShoppingItem> => {
    const { data } = await api.patch<ShoppingItem>(`/${id}`, patch);
    return data;
  },

  markCompleted: async (id: number): Promise<ShoppingItem> => {
    const { data } = await api.patch<ShoppingItem>(`/${id}`, {
      completed: true,
      completedAt: new Date().toISOString(),
    });
    return data;
  },

  undoCompleted: async (id: number): Promise<ShoppingItem> => {
    const { data } = await api.patch<ShoppingItem>(`/${id}`, {
      completed: false,
      completedAt: undefined,
    });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/${id}`);
  },
};
