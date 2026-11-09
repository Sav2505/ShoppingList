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
const { createHmac, timingSafeEqual, scrypt: scryptCallback } = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(scryptCallback);

const PORT = process.env.PORT || 3030;
const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('[DB] TURSO_URL or TURSO_TOKEN is not set');
  process.exit(1);
}

if (!AUTH_SECRET || Buffer.byteLength(AUTH_SECRET) < 32) {
  console.error('[AUTH] AUTH_SECRET must be set to a stable secret of at least 32 bytes');
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
  await db.execute('SELECT id, username, password_hash FROM users LIMIT 1');
  await db.execute('SELECT user_id FROM items LIMIT 1');
  console.log('[DB] Connected to Turso');
}

function signUser(id) {
  const payload = String(id);
  return `${payload}.${createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')}`;
}

async function authenticate(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[1-9]\d*$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  const expected = Buffer.from(signUser(parts[0]).split('.')[1], 'base64url');
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const result = await db.execute({ sql: 'SELECT id, username FROM users WHERE id = ?', args: [parts[0]] });
  if (!result.rows.length) return null;
  return { id: Number(result.rows[0].id), username: result.rows[0].username };
}

async function requireAuth(req, res, next) {
  try {
    const token = req.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    req.user = await authenticate(token);
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  } catch (e) {
    console.error('[AUTH]', e.message);
    res.status(500).json({ error: 'Authentication unavailable' });
  }
}

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 200 || password.length > 1024) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    const result = await db.execute({ sql: 'SELECT id, username, password_hash FROM users WHERE username = ?', args: [username.trim()] });
    const row = result.rows[0];
    const [salt, hash] = (row?.password_hash || 'e08806528403878d80fcf63cf447e992:b15d742b2749976f5962e84410cc63e5fd58d665f7d3c9f57a145c5776360577a1287ee8400faf5bda45355c88ef2e0c0a359ca7a709d345401d1346d67c6527').split(':');
    const expected = Buffer.from(hash, 'hex');
    const actual = await scrypt(password, salt, 64);
    if (!row || expected.length !== actual.length || !timingSafeEqual(actual, expected)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = { id: Number(row.id), username: row.username };
    res.json({ token: signUser(user.id), user });
  } catch (e) {
    console.error('[AUTH]', e.message);
    res.status(500).json({ error: 'Authentication unavailable' });
  }
});

app.get('/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

io.use(async (socket, next) => {
  try {
    const user = await authenticate(socket.handshake.auth?.token);
    if (!user) return next(new Error('Unauthorized'));
    socket.data.user = user;
    next();
  } catch {
    next(new Error('Authentication unavailable'));
  }
});

app.use('/items', requireAuth);

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
app.get('/items', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM items WHERE user_id = ? ORDER BY id ASC', args: [req.user.id] });
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
      sql: 'INSERT INTO items (name, category, quantity, completed, createdAt, user_id) VALUES (?, ?, ?, 0, ?, ?) RETURNING *',
      args: [name, category, quantity, createdAt, req.user.id],
    });
    const item = rowToItem(result.rows[0]);
    io.to(`user:${req.user.id}`).emit('item:created', item);
    res.status(201).json(item);
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
    const allowed = ['name', 'category', 'quantity', 'completed', 'completedAt'];
    if (fields.some((field) => !allowed.includes(field))) return res.status(400).json({ error: 'Invalid fields' });
    const set = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => req.body[f]);
    const result = await db.execute({ sql: `UPDATE items SET ${set} WHERE id = ? AND user_id = ? RETURNING *`, args: [...values, id, req.user.id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const item = rowToItem(result.rows[0]);
    const event = Object.hasOwn(req.body, 'completed') ? (item.completed ? 'item:completed' : 'item:undo') : 'item:updated';
    io.to(`user:${req.user.id}`).emit(event, item);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /items/:id
app.delete('/items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await db.execute({ sql: 'DELETE FROM items WHERE id = ? AND user_id = ? RETURNING id', args: [id, req.user.id] });
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    io.to(`user:${req.user.id}`).emit('item:deleted', id);
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
  socket.join(`user:${socket.data.user.id}`);
  socket.on('disconnect', () => console.log(`[WS] client disconnected: ${socket.id}`));
});

const KEEP_ALIVE_MS = 10 * 60 * 1000; // כל 10 דקות

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
