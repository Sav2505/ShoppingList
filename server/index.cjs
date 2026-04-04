// server/index.cjs — Socket.IO + JSON Server
const path = require('path');
const fs = require('fs');

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jsonServer = require('json-server');

const PORT = process.env.PORT || 3030;
const DB_FILE = path.join(__dirname, 'db.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ items: [] }, null, 2));
}

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
  transports: ['websocket', 'polling'],
});

// Serve frontend FIRST
const DIST = path.join(__dirname, '../dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
}

// JSON Server
const router = jsonServer.router(DB_FILE);
const middlewares = jsonServer.defaults({ noCors: true });
app.use(middlewares);
app.use(router);

// SPA fallback
if (fs.existsSync(DIST)) {
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// Socket events
io.on('connection', (socket) => {
  console.log(`[WS] client connected: ${socket.id}`);
  socket.on('item:created', (item) => socket.broadcast.emit('item:created', item));
  socket.on('item:updated', (item) => socket.broadcast.emit('item:updated', item));
  socket.on('item:completed', (item) => socket.broadcast.emit('item:completed', item));
  socket.on('item:undo', (item) => socket.broadcast.emit('item:undo', item));
  socket.on('item:deleted', (id) => socket.broadcast.emit('item:deleted', id));
  socket.on('disconnect', () => console.log(`[WS] client disconnected: ${socket.id}`));
});

httpServer.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[WS]     Socket.IO ready`);
  if (fs.existsSync(DIST)) console.log('[STATIC] Serving frontend from dist/');
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`[SERVER] Port ${PORT} in use`); process.exit(1); }
  throw err;
});
