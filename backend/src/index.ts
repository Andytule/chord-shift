import './env';

import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { registerLobbyHandlers } from './lobby/handlers';
import { lobbyStore } from './lobby/LobbyStore';
import sheetsRouter from './routes/sheets';
import transposeRouter from './routes/transpose';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5001;

const allowedOrigins = [
  'https://andytule.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

// ─── Express middleware ───────────────────────────────────────────────────────

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'ChordShift API is running' });
});

app.use('/sheets', sheetsRouter);
app.use('/transpose', transposeRouter);

// ─── Socket.io ────────────────────────────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[socket] Connected: ${socket.id}`);
  registerLobbyHandlers(io, socket, lobbyStore);
});

// ─── Lobby Cleanup ────────────────────────────────────────────────────────────

// Clean up stale lobbies every 5 minutes
const LOBBY_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  // Get all lobby codes first to avoid modification during iteration
  const allLobbies = Array.from(lobbyStore['lobbies'].entries());

  for (const [code, lobby] of allLobbies) {
    const age = now - lobby.createdAt.getTime();
    if (age > LOBBY_TTL_MS) {
      console.log(
        `[lobby] Cleaning up stale lobby ${code} (age: ${Math.round(age / 1000 / 60)}min)`
      );
      io.to(code).emit('lobby:closed', {
        reason: 'Session expired after 4 hours of inactivity',
      });
      lobbyStore.closeLobby(code);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[lobby] Cleaned up ${cleanedCount} stale lobbies. Active: ${lobbyStore.count()}`);
  }
}, CLEANUP_INTERVAL_MS);

// ─── Boot ─────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
