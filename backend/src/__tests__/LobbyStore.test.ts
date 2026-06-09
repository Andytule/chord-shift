import { LobbyStore } from '../lobby/LobbyStore';
import type { LobbyState } from '../lobby/types';

const baseState: LobbyState = {
  sheetText: 'Am  F  C  G',
  semitones: 0,
  strategy: 'semitone',
  capoFret: 0,
  useFlats: false,
  scrollY: 0,
  detectedKey: 'A',
};

describe('LobbyStore', () => {
  let store: LobbyStore;

  beforeEach(() => {
    store = new LobbyStore();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns a lobby with a 4-char uppercase code', () => {
      const lobby = store.create('socket-1', 'Alice', baseState);
      expect(lobby.code).toMatch(/^[A-Z2-9]{4}$/);
    });

    it('stores the leader as a participant', () => {
      const lobby = store.create('socket-1', 'Alice', baseState);
      const leader = lobby.participants.get('socket-1');
      expect(leader).toBeDefined();
      expect(leader?.isLeader).toBe(true);
      expect(leader?.displayName).toBe('Alice');
    });

    it('stores the initial state', () => {
      const lobby = store.create('socket-1', 'Alice', baseState);
      expect(lobby.state).toEqual(baseState);
    });

    it('generates unique codes for multiple lobbies', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const lobby = store.create(`socket-${i}`, 'User', baseState);
        codes.add(lobby.code);
      }
      expect(codes.size).toBe(50);
    });

    it('increments count correctly', () => {
      store.create('s1', 'A', baseState);
      store.create('s2', 'B', baseState);
      expect(store.count()).toBe(2);
    });
  });

  // ── addParticipant ──────────────────────────────────────────────────────────

  describe('addParticipant', () => {
    it('adds a follower to an existing lobby', () => {
      const lobby = store.create('leader-socket', 'Leader', baseState);
      store.addParticipant(lobby.code, 'follower-socket', 'Bob');
      const updated = store.get(lobby.code)!;
      expect(updated.participants.size).toBe(2);
      const follower = updated.participants.get('follower-socket');
      expect(follower?.isLeader).toBe(false);
      expect(follower?.displayName).toBe('Bob');
    });

    it('throws for an unknown lobby code', () => {
      expect(() => store.addParticipant('XXXX', 'socket', 'Bob')).toThrow();
    });
  });

  // ── updateState ─────────────────────────────────────────────────────────────

  describe('updateState', () => {
    it('merges partial state correctly', () => {
      const lobby = store.create('s1', 'A', baseState);
      const updated = store.updateState(lobby.code, { semitones: 3, useFlats: true });
      expect(updated.semitones).toBe(3);
      expect(updated.useFlats).toBe(true);
      expect(updated.sheetText).toBe(baseState.sheetText); // unchanged fields preserved
    });

    it('throws for an unknown lobby code', () => {
      expect(() => store.updateState('XXXX', { semitones: 1 })).toThrow();
    });
  });

  // ── removeSocket ────────────────────────────────────────────────────────────

  describe('removeSocket', () => {
    it('returns null when socket is not in any lobby', () => {
      expect(store.removeSocket('ghost-socket')).toBeNull();
    });

    it('removes a follower without closing the lobby', () => {
      const lobby = store.create('leader', 'Alice', baseState);
      store.addParticipant(lobby.code, 'follower', 'Bob');

      const result = store.removeSocket('follower');
      expect(result).not.toBeNull();
      expect(result!.wasLeader).toBe(false);

      const remaining = store.get(lobby.code)!;
      expect(remaining).toBeDefined(); // lobby still open
      expect(remaining.participants.has('follower')).toBe(false);
      expect(remaining.participants.size).toBe(1);
    });

    it('closes the lobby when the leader disconnects', () => {
      const lobby = store.create('leader', 'Alice', baseState);
      store.addParticipant(lobby.code, 'follower', 'Bob');

      const result = store.removeSocket('leader');
      expect(result!.wasLeader).toBe(true);
      expect(store.get(lobby.code)).toBeUndefined(); // lobby deleted
      expect(store.count()).toBe(0);
    });
  });

  // ── isLeader ────────────────────────────────────────────────────────────────

  describe('isLeader', () => {
    it('returns true for the leader socket', () => {
      const lobby = store.create('leader', 'Alice', baseState);
      expect(store.isLeader(lobby.code, 'leader')).toBe(true);
    });

    it('returns false for a follower socket', () => {
      const lobby = store.create('leader', 'Alice', baseState);
      store.addParticipant(lobby.code, 'follower', 'Bob');
      expect(store.isLeader(lobby.code, 'follower')).toBe(false);
    });

    it('returns false for an unknown code', () => {
      expect(store.isLeader('XXXX', 'any-socket')).toBe(false);
    });
  });

  // ── getBySocketId ───────────────────────────────────────────────────────────

  describe('getBySocketId', () => {
    it('finds a lobby by any participant socket id', () => {
      const lobby = store.create('leader', 'Alice', baseState);
      store.addParticipant(lobby.code, 'follower', 'Bob');
      expect(store.getBySocketId('leader')?.code).toBe(lobby.code);
      expect(store.getBySocketId('follower')?.code).toBe(lobby.code);
    });

    it('returns undefined for unknown sockets', () => {
      expect(store.getBySocketId('nobody')).toBeUndefined();
    });
  });

  // ── closeLobby ──────────────────────────────────────────────────────────────

  describe('closeLobby', () => {
    it('removes the lobby and returns it', () => {
      const lobby = store.create('leader', 'Alice', baseState);
      const closed = store.closeLobby(lobby.code);
      expect(closed?.code).toBe(lobby.code);
      expect(store.count()).toBe(0);
    });

    it('returns null for a non-existent code', () => {
      expect(store.closeLobby('XXXX')).toBeNull();
    });
  });
});
