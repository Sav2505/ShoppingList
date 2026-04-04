import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ShoppingItem } from '@/types/item';

// Typed server-to-client events (receive)
interface ServerToClientEvents {
  'item:created': (item: ShoppingItem) => void;
  'item:updated': (item: ShoppingItem) => void;
  'item:completed': (item: ShoppingItem) => void;
  'item:undo': (item: ShoppingItem) => void;
  'item:deleted': (id: number) => void;
}

// Typed client-to-server events (send)
interface ClientToServerEvents {
  'item:created': (item: ShoppingItem) => void;
  'item:updated': (item: ShoppingItem) => void;
  'item:completed': (item: ShoppingItem) => void;
  'item:undo': (item: ShoppingItem) => void;
  'item:deleted': (id: number) => void;
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let _socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!_socket) {
    _socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    _socket.on('connect', () => {
      console.log('[Socket] connected:', _socket?.id);
    });
    _socket.on('disconnect', (reason) => {
      console.log('[Socket] disconnected:', reason);
    });
    _socket.on('connect_error', (err) => {
      console.warn('[Socket] connection error:', err.message);
    });
  }
  return _socket;
}

// Explicit per-event helpers (avoids generic inference issues with socket.io types)
export const socketEvents = {
  onItemCreated: (handler: (item: ShoppingItem) => void) => {
    getSocket().on('item:created', handler);
    return () => getSocket().off('item:created', handler);
  },
  onItemUpdated: (handler: (item: ShoppingItem) => void) => {
    getSocket().on('item:updated', handler);
    return () => getSocket().off('item:updated', handler);
  },
  onItemCompleted: (handler: (item: ShoppingItem) => void) => {
    getSocket().on('item:completed', handler);
    return () => getSocket().off('item:completed', handler);
  },
  onItemUndo: (handler: (item: ShoppingItem) => void) => {
    getSocket().on('item:undo', handler);
    return () => getSocket().off('item:undo', handler);
  },
  onItemDeleted: (handler: (id: number) => void) => {
    getSocket().on('item:deleted', handler);
    return () => getSocket().off('item:deleted', handler);
  },

  emitCreated: (item: ShoppingItem) => getSocket().emit('item:created', item),
  emitUpdated: (item: ShoppingItem) => getSocket().emit('item:updated', item),
  emitCompleted: (item: ShoppingItem) => getSocket().emit('item:completed', item),
  emitUndo: (item: ShoppingItem) => getSocket().emit('item:undo', item),
  emitDeleted: (id: number) => getSocket().emit('item:deleted', id),
};

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}

