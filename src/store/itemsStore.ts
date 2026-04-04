import { create } from 'zustand';
import type { ShoppingItem } from '@/types/item';

interface ItemsState {
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;

  setItems: (items: ShoppingItem[]) => void;
  addItem: (item: ShoppingItem) => void;
  updateItem: (item: ShoppingItem) => void;
  removeItem: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useItemsStore = create<ItemsState>((set) => ({
  items: [],
  loading: false,
  error: null,

  setItems: (items) => set({ items }),

  addItem: (item) =>
    set((state) => {
      // Prevent duplicates
      const exists = state.items.some((i) => i.id === item.id);
      if (exists) return state;
      return { items: [item, ...state.items] };
    }),

  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? item : i)),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
}));
