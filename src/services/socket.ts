import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ShoppingItem } from '@/types/item';
import { getToken } from '@/services/auth';

// Typed server-to-client events (receive)
interface ServerToClientEvents {
  'item:created': (item: ShoppingItem) => void;
  'item:updated': (item: ShoppingItem) => void;
  'item:completed': (item: ShoppingItem) => void;
  'item:undo': (item: ShoppingItem) => void;
  'item:deleted': (id: number) => void;
}

// Typed client-to-server events (send)
type AppSocket = Socket<ServerToClientEvents>;

let _socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!_socket) {
    _socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token: getToken() },
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

};

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}

