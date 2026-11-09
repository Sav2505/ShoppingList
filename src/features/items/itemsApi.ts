import axios from 'axios';
import type { NewItemPayload, ShoppingItem } from '@/types/item';
import { getToken } from '@/services/auth';

const api = axios.create({ baseURL: '/items' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, undefined, { synchronous: true });

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && error.config?.headers?.Authorization === `Bearer ${getToken()}`) {
    window.dispatchEvent(new Event('shopping:unauthorized'));
  }
  return Promise.reject(error);
});

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

  update: async (
    id: number,
    patch: Omit<Partial<ShoppingItem>, 'completedAt'> & { completedAt?: string | null },
  ): Promise<ShoppingItem> => {
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
      completedAt: null,
    });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/${id}`);
  },
};
