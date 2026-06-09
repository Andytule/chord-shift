import type { Server, Socket } from 'socket.io';

import type { LobbyStore } from './LobbyStore';
import type {
  CreateLobbyPayload,
  JoinLobbyPayload,
  LobbyState,
  Participant,
  ScrollSyncPayload,
  StateUpdatePayload,
} from './types';

// Strip socketIds before sending participant lists to clients
function sanitiseParticipants(participants: Map<string, Participant>) {
  return Array.from(participants.values()).map(({ displayName, isLeader }) => ({
    displayName,
    isLeader,
  }));
}

function isValidState(s: unknown): s is Partial<LobbyState> {
  if (typeof s !== 'object' || s === null) return false;

  const state = s as Partial<LobbyState>;

  // Validate sheetText
  if ('sheetText' in state) {
    if (typeof state.sheetText !== 'string') return false;
    if (state.sheetText.length > 100000) return false; // 100KB limit
  }

  // Validate semitones
  if ('semitones' in state) {
    if (typeof state.semitones !== 'number') return false;
    if (!Number.isInteger(state.semitones)) return false;
    if (Math.abs(state.semitones) > 12) return false; // +/- 1 octave max
  }

  // Validate strategy
  if ('strategy' in state) {
    if (state.strategy !== 'semitone' && state.strategy !== 'capo') return false;
  }

  // Validate capoFret
  if ('capoFret' in state) {
    if (typeof state.capoFret !== 'number') return false;
    if (!Number.isInteger(state.capoFret)) return false;
    if (state.capoFret < 0 || state.capoFret > 12) return false;
  }

  // Validate useFlats
  if ('useFlats' in state) {
    if (typeof state.useFlats !== 'boolean') return false;
  }

  // Validate scrollY
  if ('scrollY' in state) {
    if (typeof state.scrollY !== 'number') return false;
    if (state.scrollY < 0 || state.scrollY > 1) return false;
  }

  // Validate detectedKey
  if ('detectedKey' in state) {
    if (state.detectedKey !== null && typeof state.detectedKey !== 'string') return false;
    if (typeof state.detectedKey === 'string' && state.detectedKey.length > 10) return false;
  }

  return true;
}

export function registerLobbyHandlers(io: Server, socket: Socket, store: LobbyStore): void {
  // ── lobby:create ────────────────────────────────────────────────────────────
  // Leader creates a new lobby, gets back the generated code.
  socket.on('lobby:create', (payload: CreateLobbyPayload) => {
    try {
      let displayName = 'Leader';
      if (typeof payload?.displayName === 'string' && payload.displayName.trim()) {
        const trimmed = payload.displayName.trim();
        if (trimmed.length > 32) {
          socket.emit('lobby:error', { message: 'Display name must be 32 characters or less' });
          return;
        }
        displayName = trimmed;
      }

      if (!isValidState(payload?.initialState)) {
        socket.emit('lobby:error', { message: 'initialState is required' });
        return;
      }

      const lobby = store.create(socket.id, displayName, payload.initialState);
      socket.join(lobby.code);

      socket.emit('lobby:created', {
        code: lobby.code,
        state: lobby.state,
        participants: sanitiseParticipants(lobby.participants),
      });

      console.log(`[lobby] Created ${lobby.code} by socket ${socket.id} (${displayName})`);
    } catch (err) {
      socket.emit('lobby:error', { message: (err as Error).message });
    }
  });

  // ── lobby:join ──────────────────────────────────────────────────────────────
  // Follower joins with a 4-char code and a display name. No auth required.
  socket.on('lobby:join', (payload: JoinLobbyPayload) => {
    try {
      const code = typeof payload?.code === 'string' ? payload.code.toUpperCase().trim() : '';

      let displayName = 'Guest';
      if (typeof payload?.displayName === 'string' && payload.displayName.trim()) {
        const trimmed = payload.displayName.trim();
        if (trimmed.length > 32) {
          socket.emit('lobby:error', { message: 'Display name must be 32 characters or less' });
          return;
        }
        displayName = trimmed;
      }

      if (code.length !== 4) {
        socket.emit('lobby:error', { message: 'Lobby code must be 4 characters' });
        return;
      }

      if (!store.get(code)) {
        socket.emit('lobby:error', { message: `Lobby ${code} does not exist` });
        return;
      }

      const lobby = store.addParticipant(code, socket.id, displayName);
      socket.join(code);

      // Tell the joiner the current state + who's in the room
      socket.emit('lobby:joined', {
        code,
        state: lobby.state,
        participants: sanitiseParticipants(lobby.participants),
      });

      // Tell everyone else a new participant arrived
      socket.to(code).emit('lobby:participants', {
        participants: sanitiseParticipants(lobby.participants),
      });

      console.log(`[lobby] ${socket.id} (${displayName}) joined ${code}`);
    } catch (err) {
      socket.emit('lobby:error', { message: (err as Error).message });
    }
  });

  // ── lobby:state_update ──────────────────────────────────────────────────────
  // Leader pushes a state patch; only the Leader is allowed to call this.
  socket.on('lobby:state_update', (payload: StateUpdatePayload) => {
    try {
      const code = typeof payload?.code === 'string' ? payload.code.toUpperCase() : '';

      if (!store.isLeader(code, socket.id)) {
        socket.emit('lobby:error', { message: 'Only the Leader can update lobby state' });
        return;
      }

      if (!isValidState(payload?.state)) {
        socket.emit('lobby:error', { message: 'state payload is required' });
        return;
      }

      const newState = store.updateState(code, payload.state);

      // Broadcast the full merged state to every Follower in the room (not back to Leader)
      socket.to(code).emit('lobby:state_changed', { state: newState });
    } catch (err) {
      socket.emit('lobby:error', { message: (err as Error).message });
    }
  });

  // ── lobby:scroll_sync ───────────────────────────────────────────────────────
  // Leader broadcasts their fractional scroll position (0–1). Lightweight — no
  // full state object, just a number.
  socket.on('lobby:scroll_sync', (payload: ScrollSyncPayload) => {
    try {
      const code = typeof payload?.code === 'string' ? payload.code.toUpperCase() : '';

      if (!store.isLeader(code, socket.id)) return; // silently ignore from non-leaders

      const scrollY =
        typeof payload?.scrollY === 'number' ? Math.min(1, Math.max(0, payload.scrollY)) : 0;

      store.updateState(code, { scrollY });

      // Forward to Followers only — no need to echo back to Leader
      socket.to(code).emit('lobby:scroll_sync', { scrollY });
    } catch {
      // scroll events are fire-and-forget; swallow errors silently
    }
  });

  // ── lobby:leave ─────────────────────────────────────────────────────────────
  // Explicit leave (client-initiated). Also called internally from disconnect.
  socket.on('lobby:leave', () => {
    handleDisconnect(io, socket, store);
  });

  // ── disconnect ──────────────────────────────────────────────────────────────
  // Socket.io fires this for any connection drop. Same cleanup logic as leave.
  socket.on('disconnect', () => {
    handleDisconnect(io, socket, store);
  });
}

function handleDisconnect(io: Server, socket: Socket, store: LobbyStore): void {
  const result = store.removeSocket(socket.id);
  if (!result) return;

  const { lobby, wasLeader } = result;

  if (wasLeader) {
    // Lobby has already been deleted from the store — tell Followers to go home
    io.to(lobby.code).emit('lobby:closed', {
      reason: 'The Leader has left the session',
    });
    console.log(`[lobby] ${lobby.code} closed — leader disconnected`);
  } else {
    // Just a Follower leaving — update the participant list for everyone remaining
    io.to(lobby.code).emit('lobby:participants', {
      participants: sanitiseParticipants(lobby.participants),
    });
    console.log(`[lobby] Socket ${socket.id} left ${lobby.code}`);
  }
}
