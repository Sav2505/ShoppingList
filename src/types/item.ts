export type Category = 'supermarket' | 'pharmacy' | 'home' | 'other';

export interface ShoppingItem {
  id: number;
  name: string;
  category: Category;
  quantity?: number;
  createdAt: string;
  completed: boolean;
  completedAt?: string;
}

export type NewItemPayload = Pick<ShoppingItem, 'name' | 'category' | 'quantity'>;

export const CATEGORY_LABELS: Record<Category, string> = {
  supermarket: 'סופר',
  pharmacy: 'בית מרקחת',
  home: 'בית',
  other: 'אחר',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  supermarket: '#4caf50',
  pharmacy: '#2196f3',
  home: '#ff9800',
  other: '#9c27b0',
};
