import type { Lobby, LobbyCode, LobbyState, Participant } from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
const CODE_LENGTH = 4;
const MAX_LOBBIES = 500; // safety ceiling

function generateCode(existing: Set<LobbyCode>): LobbyCode {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    if (!existing.has(code)) return code;
  }
  throw new Error('Failed to generate a unique lobby code — server is at capacity');
}

export class LobbyStore {
  private lobbies = new Map<LobbyCode, Lobby>();

  // ── Write ──────────────────────────────────────────────────────────────────

  create(leaderSocketId: string, displayName: string, initialState: LobbyState): Lobby {
    if (this.lobbies.size >= MAX_LOBBIES) {
      throw new Error('Server lobby limit reached');
    }

    const code = generateCode(new Set(this.lobbies.keys()));

    const leader: Participant = {
      socketId: leaderSocketId,
      displayName,
      isLeader: true,
    };

    const lobby: Lobby = {
      code,
      leaderSocketId,
      state: { ...initialState },
      participants: new Map([[leaderSocketId, leader]]),
      createdAt: new Date(),
    };

    this.lobbies.set(code, lobby);
    return lobby;
  }

  addParticipant(code: LobbyCode, socketId: string, displayName: string): Lobby {
    const lobby = this.getOrThrow(code);

    const participant: Participant = {
      socketId,
      displayName,
      isLeader: false,
    };

    lobby.participants.set(socketId, participant);
    return lobby;
  }

  updateState(code: LobbyCode, patch: Partial<LobbyState>): LobbyState {
    const lobby = this.getOrThrow(code);
    lobby.state = { ...lobby.state, ...patch };
    return lobby.state;
  }

  /**
   * Remove a socket from any lobby it belongs to.
   * Returns the affected lobby (if any) and whether the removed socket was the leader.
   */
  removeSocket(socketId: string): { lobby: Lobby; wasLeader: boolean } | null {
    for (const lobby of this.lobbies.values()) {
      if (lobby.participants.has(socketId)) {
        const wasLeader = lobby.leaderSocketId === socketId;
        lobby.participants.delete(socketId);

        if (wasLeader) {
          // Leader gone → close the lobby entirely
          this.lobbies.delete(lobby.code);
        }

        return { lobby, wasLeader };
      }
    }
    return null;
  }

  closeLobby(code: LobbyCode): Lobby | null {
    const lobby = this.lobbies.get(code);
    if (lobby) this.lobbies.delete(code);
    return lobby ?? null;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  get(code: LobbyCode): Lobby | undefined {
    return this.lobbies.get(code);
  }

  getBySocketId(socketId: string): Lobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (lobby.participants.has(socketId)) return lobby;
    }
    return undefined;
  }

  isLeader(code: LobbyCode, socketId: string): boolean {
    return this.lobbies.get(code)?.leaderSocketId === socketId;
  }

  count(): number {
    return this.lobbies.size;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private getOrThrow(code: LobbyCode): Lobby {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error(`Lobby ${code} not found`);
    return lobby;
  }
}

// Singleton — one store shared across the whole process lifetime
export const lobbyStore = new LobbyStore();
