import { useCallback, useEffect, useRef, useState } from 'react';
import { itemsApi } from './itemsApi';
import { useItemsStore } from '@/store/itemsStore';
import { socketEvents } from '@/services/socket';
import type { NewItemPayload, ShoppingItem } from '@/types/item';

// 10 minutes in ms
const DELETION_DELAY_MS = 10 * 60 * 1000;

interface UndoSnackbar {
  itemId: number;
  itemName: string;
  open: boolean;
}

export function useItems() {
  const { items, setItems, addItem, updateItem, removeItem, loading, setLoading, error, setError } =
    useItemsStore();

  // Map of itemId → timeout handle for pending deletions
  const deletionTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const [snackbar, setSnackbar] = useState<UndoSnackbar>({
    itemId: 0,
    itemName: '',
    open: false,
  });

  // ── Sorted list: active first (newest first), completed at bottom ──────────
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    itemsApi
      .getAll()
      .then((data) => {
        setItems(data);
        // Restart timers for already-completed items loaded from server
        data
          .filter((item) => item.completed && item.completedAt)
          .forEach((item) => {
            const elapsed = Date.now() - new Date(item.completedAt!).getTime();
            const remaining = DELETION_DELAY_MS - elapsed;
            if (remaining <= 0) {
              // Already overdue — delete now
              handleDeleteNow(item.id);
            } else {
              scheduleDeletion(item.id, remaining);
            }
          });
      })
      .catch(() => setError('שגיאה בטעינת הרשימה'))
      .finally(() => setLoading(false));

    return () => {
      // Cleanup all timers on unmount
      deletionTimers.current.forEach((timer) => clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket subscriptions ────────────────────────────────────────────────────
  useEffect(() => {
    const offCreated = socketEvents.onItemCreated((item) => {
      addItem(item);
    });
    const offUpdated = socketEvents.onItemUpdated((item) => {
      updateItem(item);
    });
    const offCompleted = socketEvents.onItemCompleted((item) => {
      updateItem(item);
      const elapsed = item.completedAt
        ? Date.now() - new Date(item.completedAt).getTime()
        : 0;
      scheduleDeletion(item.id, DELETION_DELAY_MS - elapsed);
    });
    const offUndo = socketEvents.onItemUndo((item) => {
      updateItem(item);
      cancelDeletion(item.id);
    });
    const offDeleted = socketEvents.onItemDeleted((id) => {
      cancelDeletion(id);
      removeItem(id);
    });

    return () => {
      offCreated();
      offUpdated();
      offCompleted();
      offUndo();
      offDeleted();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function scheduleDeletion(id: number, delay: number): void {
    cancelDeletion(id);
    const timer = setTimeout(() => {
      handleDeleteNow(id);
    }, delay);
    deletionTimers.current.set(id, timer);
  }

  function cancelDeletion(id: number): void {
    const timer = deletionTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      deletionTimers.current.delete(id);
    }
  }

  function handleDeleteNow(id: number): void {
    removeItem(id);
    itemsApi.delete(id).catch(() => {/* already gone */});
    socketEvents.emitDeleted(id);
    deletionTimers.current.delete(id);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const addNewItem = useCallback(
    async (payload: NewItemPayload): Promise<void> => {
      // Optimistic: add with temp negative id
      const tempId = -Date.now();
      const optimistic: ShoppingItem = {
        id: tempId,
        name: payload.name,
        category: payload.category,
        createdAt: new Date().toISOString(),
        completed: false,
      };
      addItem(optimistic);

      try {
        const saved = await itemsApi.create(payload);
        // Replace optimistic entry with real server entry
        removeItem(tempId);
        addItem(saved);
        socketEvents.emitCreated(saved);
      } catch {
        removeItem(tempId);
        setError('שגיאה בהוספת פריט');
      }
    },
    [addItem, removeItem, setError],
  );

  const markBought = useCallback(
    async (id: number): Promise<void> => {
      const item = items.find((i) => i.id === id);
      if (!item || item.completed) return;

      // Optimistic
      const updated: ShoppingItem = {
        ...item,
        completed: true,
        completedAt: new Date().toISOString(),
      };
      updateItem(updated);
      scheduleDeletion(id, DELETION_DELAY_MS);
      setSnackbar({ itemId: id, itemName: item.name, open: true });

      try {
        const saved = await itemsApi.markCompleted(id);
        updateItem(saved);
        socketEvents.emitCompleted(saved);
      } catch {
        // Rollback
        updateItem(item);
        cancelDeletion(id);
        setError('שגיאה בסימון פריט');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, updateItem, setError],
  );

  const undoBought = useCallback(
    async (id: number): Promise<void> => {
      const item = items.find((i) => i.id === id);
      if (!item || !item.completed) return;

      cancelDeletion(id);
      setSnackbar((s) => ({ ...s, open: false }));

      // Optimistic
      const restored: ShoppingItem = { ...item, completed: false, completedAt: undefined };
      updateItem(restored);

      try {
        const saved = await itemsApi.undoCompleted(id);
        updateItem(saved);
        socketEvents.emitUndo(saved);
      } catch {
        // Rollback
        updateItem(item);
        scheduleDeletion(id, DELETION_DELAY_MS);
        setError('שגיאה בביטול סימון');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, updateItem, setError],
  );

  const deleteItem = useCallback(
    async (id: number): Promise<void> => {
      cancelDeletion(id);
      removeItem(id);
      try {
        await itemsApi.delete(id);
        socketEvents.emitDeleted(id);
      } catch {
        setError('שגיאה במחיקת פריט');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removeItem, setError],
  );

  const closeSnackbar = useCallback(() => {
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  return {
    items: sortedItems,
    loading,
    error,
    snackbar,
    addNewItem,
    markBought,
    undoBought,
    deleteItem,
    closeSnackbar,
  };
}
