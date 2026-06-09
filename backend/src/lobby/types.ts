// ─── Lobby domain types ───────────────────────────────────────────────────────

export type LobbyCode = string; // 4-char alphanumeric, e.g. "MZ8K"

/**
 * The canonical state of a lobby that the Leader owns.
 * Broadcast to Followers on every change.
 */
export interface LobbyState {
  sheetText: string;
  semitones: number;
  strategy: 'semitone' | 'capo';
  capoFret: number;
  useFlats: boolean;
  scrollY: number; // fractional scroll position 0–1
  detectedKey: string | null;
}

/** Metadata about a single participant (Leader or Follower). */
export interface Participant {
  socketId: string;
  displayName: string; // chosen at join time, not tied to auth
  isLeader: boolean;
}

/** Full in-memory lobby record. */
export interface Lobby {
  code: LobbyCode;
  leaderSocketId: string;
  state: LobbyState;
  participants: Map<string, Participant>; // socketId → Participant
  createdAt: Date;
}

// ─── Socket.io event payloads (C→S) ──────────────────────────────────────────

export interface CreateLobbyPayload {
  displayName: string;
  initialState: LobbyState;
}

export interface JoinLobbyPayload {
  code: LobbyCode;
  displayName: string;
}

export interface StateUpdatePayload {
  code: LobbyCode;
  state: Partial<LobbyState>;
}

export interface ScrollSyncPayload {
  code: LobbyCode;
  scrollY: number;
}

// ─── Socket.io event payloads (S→C) ──────────────────────────────────────────

export interface LobbyCreatedPayload {
  code: LobbyCode;
  state: LobbyState;
}

export interface LobbyJoinedPayload {
  code: LobbyCode;
  state: LobbyState;
  participants: Omit<Participant, 'socketId'>[];
}

export interface ParticipantListPayload {
  participants: Omit<Participant, 'socketId'>[];
}

export interface StateChangedPayload {
  state: LobbyState;
}

export interface LobbyErrorPayload {
  message: string;
}

export interface LobbyClosedPayload {
  reason: string;
}
