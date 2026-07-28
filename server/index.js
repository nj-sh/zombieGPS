import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDatabase } from './supabase.js';
import { setupSocketHandlers } from './socket-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../client');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static client files (absolute path for Render)
app.use(express.static(clientDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Game stats endpoint
import { db } from './supabase.js';

app.get('/api/stats', async (req, res) => {
  try {
    const players = await db.getAllPlayers();
    res.json({
      online: players.length,
      survivors: players.filter(p => p.team === 'survivor').length,
      zombies: players.filter(p => p.team === 'zombie').length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Catch-all: serve index.html for any unmatched GET (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
async function start() {
  await initDatabase();
  setupSocketHandlers(io);

  httpServer.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════╗
║     ZOMBIE APOCALYPSE SERVER             ║
║──────────────────────────────────────────║
║  Port: ${String(config.port).padEnd(28)}║
║  Mode: ${config.nodeEnv.padEnd(28)}║
║  GPS: ${String(config.nodeEnv).padEnd(28)}║
║  Ready for outbreak...                   ║
╚══════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);
