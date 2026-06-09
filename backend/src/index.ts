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

// ─── Boot ─────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
