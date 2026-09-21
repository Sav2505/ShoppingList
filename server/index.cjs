// server/index.cjs — Socket.IO + Turso (LibSQL)
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@libsql/client');

const PORT = process.env.PORT || 3030;
const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('[DB] TURSO_URL or TURSO_TOKEN is not set');
  process.exit(1);
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

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

// Init DB table
async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      completed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      completedAt TEXT
    )
  `);
  console.log('[DB] Connected to Turso');
}

function rowToItem(row) {
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity),
    completed: row.completed === 1 || row.completed === true,
    createdAt: row.createdAt,
    completedAt: row.completedAt || undefined,
  };
}

// GET /items
app.get('/items', async (_req, res) => {
  try {
    const result = await db.execute('SELECT * FROM items ORDER BY id ASC');
    res.json(result.rows.map(rowToItem));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /items
app.post('/items', async (req, res) => {
  try {
    const { name, category, quantity = 1 } = req.body;
    const createdAt = new Date().toISOString();
    const result = await db.execute({
      sql: 'INSERT INTO items (name, category, quantity, completed, createdAt) VALUES (?, ?, ?, 0, ?) RETURNING *',
      args: [name, category, quantity, createdAt],
    });
    res.status(201).json(rowToItem(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /items/:id
app.patch('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fields = Object.keys(req.body);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields' });
    const set = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => req.body[f]);
    await db.execute({ sql: `UPDATE items SET ${set} WHERE id = ?`, args: [...values, id] });
    const result = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rowToItem(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /items/:id
app.delete('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [id] });
    res.status(200).json({});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', async (_req, res) => {
  try {
    await db.execute('SELECT 1');
    res.status(200).json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
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

const KEEP_ALIVE_MS = 60 * 1000; // כל דקה

function startKeepAlive() {
  // Render מספק את המשתנה הזה אוטומטית
  const baseUrl = process.env.RENDER_EXTERNAL_URL;
  if (!baseUrl) {
    console.log('[KEEPALIVE] RENDER_EXTERNAL_URL not set, skipping');
    return;
  }

  setInterval(async () => {
    try {
      const r = await fetch(`${baseUrl}/health`);
      console.log(`[KEEPALIVE] ping status ${r.status}`);
    } catch (e) {
      console.error('[KEEPALIVE] ping failed:', e.message);
    }
  }, KEEP_ALIVE_MS);
}

initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      console.log(`[WS]     Socket.IO ready`);
      if (fs.existsSync(DIST)) console.log('[STATIC] Serving frontend from dist/');
      startKeepAlive();
    });
  })
  .catch((err) => {
    console.error('[DB] Init failed:', err.message);
    process.exit(1);
  });

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') { console.error(`[SERVER] Port ${PORT} in use`); process.exit(1); }
  throw err;
});
