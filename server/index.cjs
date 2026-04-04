// server/index.cjs — Socket.IO + MongoDB Atlas
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 3030;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('[DB] MONGODB_URI is not set');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
app.use(express.json());

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

// MongoDB connection — start server only after DB is ready
let itemsCollection;
MongoClient.connect(MONGODB_URI, {
  tls: true,
  serverApi: { version: '1' },
})
  .then((client) => {
    itemsCollection = client.db('shopping').collection('items');
    console.log('[DB] Connected to MongoDB Atlas');
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      console.log(`[WS]     Socket.IO ready`);
      if (fs.existsSync(DIST)) console.log('[STATIC] Serving frontend from dist/');
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

function col() {
  if (!itemsCollection) throw new Error('DB not ready');
  return itemsCollection;
}

async function nextId() {
  const last = await col().findOne({}, { sort: { id: -1 }, projection: { id: 1 } });
  return last ? last.id + 1 : 1;
}

// GET /items
app.get('/items', async (_req, res) => {
  try {
    const items = await col().find({}, { projection: { _id: 0 } }).toArray();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /items
app.post('/items', async (req, res) => {
  try {
    const id = await nextId();
    const item = { id, completed: false, createdAt: new Date().toISOString(), ...req.body };
    await col().insertOne(item);
    const { _id, ...result } = item;
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /items/:id
app.patch('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await col().findOneAndUpdate(
      { id },
      { $set: req.body },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /items/:id
app.delete('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await col().deleteOne({ id });
    res.status(200).json({});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`[SERVER] Port ${PORT} in use`); process.exit(1); }
  throw err;
});
