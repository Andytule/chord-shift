import { registerLobbyHandlers } from '../lobby/handlers';
import { LobbyStore } from '../lobby/LobbyStore';
import type { LobbyState } from '../lobby/types';

// ─── Minimal Socket.io mock ───────────────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void;

function makeSocket(id: string) {
  const listeners = new Map<string, EventHandler>();
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const rooms = new Set<string>();

  const socket = {
    id,
    listeners,
    emitted,
    rooms,
    on(event: string, handler: EventHandler) {
      listeners.set(event, handler);
    },
    emit(event: string, payload?: unknown) {
      emitted.push({ event, payload });
    },
    join(room: string) {
      rooms.add(room);
    },
    to(_room: string) {
      // Returns a chainable emitter that records into a shared array on `io`
      return { emit: (_ev: string, _p?: unknown) => {} };
    },
    // Trigger an event as if it came from the client
    trigger(event: string, payload?: unknown) {
      const handler = listeners.get(event);
      if (handler) handler(payload);
    },
  };

  return socket;
}

type MockSocket = ReturnType<typeof makeSocket>;

function makeIO(sockets: MockSocket[]) {
  const emitted: Array<{ room: string; event: string; payload: unknown }> = [];
  return {
    emitted,
    to(room: string) {
      return {
        emit(event: string, payload?: unknown) {
          emitted.push({ room, event, payload });
          // Also forward to any mock socket that joined that room
          sockets.forEach((s) => {
            if (s.rooms.has(room)) {
              s.emitted.push({ event, payload });
            }
          });
        },
      };
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseState: LobbyState = {
  sheetText: 'G  D  Em  C',
  semitones: 0,
  strategy: 'semitone',
  capoFret: 0,
  useFlats: false,
  scrollY: 0,
  detectedKey: 'G',
};

function lastEmit(socket: MockSocket, event: string) {
  return [...socket.emitted].reverse().find((e) => e.event === event)?.payload;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('lobby handlers', () => {
  let store: LobbyStore;
  let leader: MockSocket;
  let follower: MockSocket;
  let io: ReturnType<typeof makeIO>;

  beforeEach(() => {
    store = new LobbyStore();
    leader = makeSocket('leader-socket');
    follower = makeSocket('follower-socket');
    io = makeIO([leader, follower]);

    // Cast to satisfy TypeScript — our mocks fulfil the used surface area
    registerLobbyHandlers(io as never, leader as never, store);
    registerLobbyHandlers(io as never, follower as never, store);
  });

  // ── lobby:create ────────────────────────────────────────────────────────────

  describe('lobby:create', () => {
    it('emits lobby:created with code and state', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });

      const payload = lastEmit(leader, 'lobby:created') as { code: string; state: LobbyState };
      expect(payload).toBeDefined();
      expect(payload.code).toMatch(/^[A-Z2-9]{4}$/);
      expect(payload.state).toEqual(baseState);
    });

    it('joins the socket to the lobby room', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      const { code } = lastEmit(leader, 'lobby:created') as { code: string };
      expect(leader.rooms.has(code)).toBe(true);
    });

    it('emits lobby:error when initialState is missing', () => {
      leader.trigger('lobby:create', { displayName: 'Alice' });
      const err = lastEmit(leader, 'lobby:error') as { message: string };
      expect(err.message).toBeTruthy();
    });

    it('stores the lobby in the store', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      expect(store.count()).toBe(1);
    });
  });

  // ── lobby:join ──────────────────────────────────────────────────────────────

  describe('lobby:join', () => {
    function createLobby() {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      return (lastEmit(leader, 'lobby:created') as { code: string }).code;
    }

    it('emits lobby:joined with state and participants', () => {
      const code = createLobby();
      follower.trigger('lobby:join', { code, displayName: 'Bob' });

      const payload = lastEmit(follower, 'lobby:joined') as {
        code: string;
        state: LobbyState;
        participants: unknown[];
      };
      expect(payload.code).toBe(code);
      expect(payload.state).toEqual(baseState);
      expect(payload.participants).toHaveLength(2);
    });

    it('joins the follower socket to the room', () => {
      const code = createLobby();
      follower.trigger('lobby:join', { code, displayName: 'Bob' });
      expect(follower.rooms.has(code)).toBe(true);
    });

    it('emits lobby:error for an unknown code', () => {
      follower.trigger('lobby:join', { code: 'XXXX', displayName: 'Bob' });
      const err = lastEmit(follower, 'lobby:error') as { message: string };
      expect(err.message).toMatch(/does not exist/i);
    });

    it('emits lobby:error for a code that is not 4 chars', () => {
      follower.trigger('lobby:join', { code: 'AB', displayName: 'Bob' });
      const err = lastEmit(follower, 'lobby:error') as { message: string };
      expect(err.message).toBeTruthy();
    });

    it('is case-insensitive for the code', () => {
      const code = createLobby();
      follower.trigger('lobby:join', { code: code.toLowerCase(), displayName: 'Bob' });
      expect(lastEmit(follower, 'lobby:joined')).toBeDefined();
    });
  });

  // ── lobby:state_update ──────────────────────────────────────────────────────

  describe('lobby:state_update', () => {
    function setup() {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      const code = (lastEmit(leader, 'lobby:created') as { code: string }).code;
      follower.trigger('lobby:join', { code, displayName: 'Bob' });
      return code;
    }

    it('accepts state updates from the leader', () => {
      const code = setup();
      // Should not error
      leader.trigger('lobby:state_update', { code, state: { semitones: 2 } });
      const err = lastEmit(leader, 'lobby:error');
      expect(err).toBeUndefined();
    });

    it('stores the updated state', () => {
      const code = setup();
      leader.trigger('lobby:state_update', { code, state: { semitones: 5 } });
      expect(store.get(code)!.state.semitones).toBe(5);
    });

    it('rejects state updates from a follower', () => {
      const code = setup();
      follower.trigger('lobby:state_update', { code, state: { semitones: 2 } });
      const err = lastEmit(follower, 'lobby:error') as { message: string };
      expect(err.message).toMatch(/leader/i);
    });
  });

  // ── lobby:scroll_sync ───────────────────────────────────────────────────────

  describe('lobby:scroll_sync', () => {
    it('clamps scrollY to 0–1', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      const code = (lastEmit(leader, 'lobby:created') as { code: string }).code;

      leader.trigger('lobby:scroll_sync', { code, scrollY: 1.5 });
      expect(store.get(code)!.state.scrollY).toBe(1);

      leader.trigger('lobby:scroll_sync', { code, scrollY: -0.2 });
      expect(store.get(code)!.state.scrollY).toBe(0);
    });

    it('silently ignores scroll from a non-leader', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      const code = (lastEmit(leader, 'lobby:created') as { code: string }).code;
      follower.trigger('lobby:join', { code, displayName: 'Bob' });

      const before = store.get(code)!.state.scrollY;
      follower.trigger('lobby:scroll_sync', { code, scrollY: 0.9 });
      expect(store.get(code)!.state.scrollY).toBe(before); // unchanged
    });
  });

  // ── disconnect / lobby:leave ─────────────────────────────────────────────────

  describe('disconnect', () => {
    it('closes the lobby when the leader disconnects', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      const code = (lastEmit(leader, 'lobby:created') as { code: string }).code;
      follower.trigger('lobby:join', { code, displayName: 'Bob' });

      leader.trigger('disconnect');

      expect(store.count()).toBe(0);
      // lobby:closed should have been broadcast to the room (check io.emitted)
      const closed = io.emitted.find((e) => e.event === 'lobby:closed');
      expect(closed).toBeDefined();
    });

    it('does not close the lobby when a follower disconnects', () => {
      leader.trigger('lobby:create', { displayName: 'Alice', initialState: baseState });
      const code = (lastEmit(leader, 'lobby:created') as { code: string }).code;
      follower.trigger('lobby:join', { code, displayName: 'Bob' });

      follower.trigger('disconnect');

      expect(store.count()).toBe(1);
      expect(store.get(code)!.participants.size).toBe(1);
    });
  });
});
