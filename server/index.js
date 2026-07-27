import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config.js';
import { initDatabase } from './supabase.js';
import { setupSocketHandlers } from './socket-handlers.js';

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

// Serve static client files
app.use(express.static('client'));

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
