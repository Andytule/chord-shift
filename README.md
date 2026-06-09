# ChordShift

A full-stack chord transposition web app with **real-time jam sessions**. Users can transpose chord sheets by semitone or capo position, toggle sharp/flat notation, save sheets to their account, and **jam together in real-time** with automatic syncing.

**Live:** https://andytule.github.io/chord-shift/  
**Backend:** Express API on port 5001  
**Auth + DB:** Supabase (Google OAuth, `chord_sheets` table)  
**Real-time:** Socket.io for WebSocket-based jam sessions

---

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 8, SCSS        |
| Backend    | Node.js, Express 5, TypeScript, ts-node   |
| Real-time  | Socket.io (WebSockets for jam sessions)   |
| Auth / DB  | Supabase (Google OAuth, PostgreSQL)       |
| Deployment | GitHub Pages (frontend), Docker (backend) |

---

## Project Structure

```
chord-shift/
├── .github/
│   └── workflows/
│       └── build.yml           # Single CI workflow — lint, format, build, test, Docker
├── .prettierrc                 # Shared Prettier config (inherited by both workspaces)
├── docker-compose.yml          # Runs frontend + backend containers together
├── .env.example                # Template for docker-compose environment variables
│
├── frontend/
│   ├── Dockerfile              # Multi-stage: Vite build → nginx:alpine
│   ├── nginx.conf              # SPA fallback + asset caching
│   ├── src/
│   │   ├── App.tsx             # Root component — view state, all handlers
│   │   ├── api/
│   │   │   └── client.ts       # All fetch calls + auth token management
│   │   ├── components/
│   │   │   ├── auth/           # LoginPage (Google OAuth via Supabase)
│   │   │   ├── editor/         # ChordSheetEditor (textarea), TransposeControls
│   │   │   ├── lobby/          # LobbyGate, LobbyView (real-time jam session UI)
│   │   │   ├── sheets/         # SheetList (saved sheets grid)
│   │   │   └── ui/             # Toast, ConfirmModal
│   │   ├── context/
│   │   │   ├── AuthContext.tsx # Supabase session + user
│   │   │   └── LobbyContext.tsx # Socket.io client, lobby state management
│   │   ├── lib/
│   │   │   ├── supabase.ts     # Supabase client (anon key)
│   │   │   └── socket.ts       # Socket.io client singleton
│   │   └── styles/
│   │       ├── abstracts/      # SCSS variables
│   │       ├── base/           # Global resets
│   │       └── main.scss       # Entry — imports all partials
│   ├── .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
│   └── vite.config.ts          # base: '/chord-shift/'
│
├── backend/
│   ├── Dockerfile              # Multi-stage: tsc build → node:alpine
│   ├── openapi/
│   │   └── openapi.yml         # Full OpenAPI 3.1 spec for all endpoints
│   ├── src/
│   │   ├── index.ts            # App bootstrap, CORS, Socket.io, route mounting
│   │   ├── env.ts              # dotenv.config() — imported first in index.ts
│   │   ├── routes/
│   │   │   ├── transpose.ts    # POST /transpose — stateless chord transformation
│   │   │   └── sheets.ts       # CRUD /sheets — all routes require JWT
│   │   ├── lobby/
│   │   │   ├── handlers.ts     # Socket.io event handlers (create, join, state sync)
│   │   │   ├── store.ts        # In-memory lobby state management
│   │   │   └── types.ts        # LobbyState, LobbyMember type definitions
│   │   ├── __tests__/
│   │   │   ├── SemitoneTransposer.test.ts
│   │   │   ├── CapoTransposer.test.ts
│   │   │   ├── ChordTransformationService.test.ts
│   │   │   └── api.test.ts
│   │   ├── middleware/
│   │   │   └── requireAuth.ts  # Validates Supabase Bearer JWT, sets req.userId
│   │   ├── services/
│   │   │   ├── ChordTransformationService.ts
│   │   │   └── TransformationFactory.ts
│   │   └── lib/
│   │       ├── chord/
│   │       │   ├── ChordComponent.ts
│   │       │   ├── Chord.ts
│   │       │   └── ChordProgression.ts
│   │       └── transposers/
│   │           ├── TranspositionStrategy.ts
│   │           ├── SemitoneTransposer.ts
│   │           └── CapoTransposer.ts
│   └── .env                    # SUPABASE_URL, SUPABASE_ANON_KEY, PORT
│
└── types/
    └── supabase.ts             # Generated Supabase database types (shared)
```

---

## Local Development

### Prerequisites

- Node.js 20+
- A Supabase project with Google OAuth enabled and a `chord_sheets` table

### 1. Backend

```bash
cd backend
npm install
# create .env (see Environment Variables below)
npm run dev       # nodemon + ts-node, restarts on save — port 5001
```

### 2. Frontend

```bash
cd frontend
npm install
# create .env (see Environment Variables below)
npm run dev       # Vite dev server — http://localhost:5173
```

---

## Docker (Production Only)

Both services are fully containerised for **production deployment**. The frontend is served by nginx; the backend runs compiled JavaScript on Node.

> **Note:** For local development, use `npm run dev` directly (see [Local Development](#local-development) above). Docker is only needed for production builds and deployment.

### Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env and fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 2. Run production containers
docker-compose up --build

# OR use Makefile
make docker
```

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5001 |

**📖 For detailed Docker documentation, see [DOCKER.md](DOCKER.md)**

> **Note:** Both Dockerfiles use the repo root as build context so the backend image can access the shared `types/` directory.

---

## Makefile Commands

A Makefile is provided for convenient development commands:

```bash
make help          # Show all available commands
make install       # Install all dependencies
make dev           # Show local dev instructions
make dev-backend   # Start backend dev server
make dev-frontend  # Start frontend dev server
make docker        # Build and run production Docker containers
make lint          # Run all linters
make test          # Run backend tests
make clean         # Clean up Docker resources
```

For the full list of commands, run `make help` or see the [Makefile](Makefile).

---

## Environment Variables

### `backend/.env`

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
PORT=5001
```

### `frontend/.env`

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

> **Note:** `VITE_SOCKET_URL` is used for Socket.io WebSocket connections. In production, both `VITE_API_URL` and `VITE_SOCKET_URL` should point to your deployed backend.

---

## Features

### 🎸 Chord Transposition
- Paste any chord sheet (lyrics + chords)
- Transpose by **semitones** (up/down the chromatic scale)
- Transpose by **capo position** (guitar-friendly)
- Toggle **sharp/flat** notation
- Save sheets to your account (requires Google login)

### 🎵 Real-Time Jam Sessions
- **Host a session** — share a 4-character code with bandmates
- **Join a session** — no login required, just enter the code
- **Leader-follower sync** — leader's changes instantly appear for all followers
- **Personal capo offset** — followers can adjust their own transposition without affecting others
- **Live scroll sync** — see where the leader is in the song
- **Automatic reconnection** — recovers from network drops
- **Session cleanup** — lobbies auto-expire after 4 hours

#### How to Use Jam Sessions

**As a Host (Leader):**
1. Click "Start Jam Session" from the home page
2. Optionally select a saved chord sheet or start with an empty sheet
3. Enter your display name
4. Share the 4-character code with your bandmates
5. Edit the chord sheet, transpose, or scroll — all followers see your changes in real-time

**As a Follower:**
1. Click "Join Jam Session"
2. Enter the 4-character code from the host
3. Enter your display name (no login required)
4. View the leader's chord sheet in real-time
5. Use the "Your Capo" control to adjust your personal transposition offset

---

## API Reference

The full OpenAPI 3.1 specification lives at [`backend/openapi/openapi.yml`](backend/openapi/openapi.yml). A summary is provided below.

### `POST /transpose`

Stateless — no auth required. Transposes a chord sheet in memory and returns the result.

**Request body:**

| Field       | Type                     | Required | Description                                                                               |
| ----------- | ------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `sheetText` | string                   | ✓        | Full chord sheet (mixed lyrics + chords)                                                  |
| `semitones` | integer                  |          | Semitones to shift (positive = up, negative = down). Used when `strategy` is `semitone`. |
| `strategy`  | `"semitone"` \| `"capo"` |          | Defaults to `"semitone"`                                                                  |
| `capoFret`  | integer                  |          | Fret position. Used when `strategy` is `"capo"`.                                          |
| `useFlats`  | boolean                  |          | Override sharp/flat preference for all chords in the sheet.                               |

**Response `200`:**

```json
{
  "transposedText": "A    E    F#m  D\nSomewhere over the rainbow",
  "originalChords": ["G", "D", "Em", "C"],
  "transposedChords": ["A", "E", "F#m", "D"],
  "detectedKey": "A"
}
```

---

### `/sheets` — all routes require `Authorization: Bearer <supabase_jwt>`

| Method   | Path          | Description                                          |
| -------- | ------------- | ---------------------------------------------------- |
| `GET`    | `/sheets`     | Returns the 20 most recent sheets for the user       |
| `GET`    | `/sheets/:id` | Returns a single sheet by ID                         |
| `POST`   | `/sheets`     | Creates a sheet — body: `{ name, sheet_text, key? }` |
| `PUT`    | `/sheets/:id` | Updates a sheet — body: `{ name?, sheet_text, key? }`|
| `DELETE` | `/sheets/:id` | Deletes a sheet                                      |

---

## CI

A single workflow file (`.github/workflows/build.yml`) runs on every push and pull request.

| Job        | Steps                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| `backend`  | Prettier check → ESLint → `tsc` build → Jest tests                         |
| `frontend` | Prettier check → ESLint → Vite build                                        |
| `docker`   | Build both Docker images (runs after both jobs above; main branch / PRs only) |

---

## Code Style

Prettier and ESLint are configured consistently across both workspaces.

- **Prettier** — single root `.prettierrc` inherited by both `frontend/` and `backend/`.
- **ESLint** — per-workspace `eslint.config.mjs` files with identical shared rules. The backend adds `globals.node`; the frontend adds `globals.browser` and the React hooks / refresh plugins.

```bash
npm run format    # Prettier write
npm run lint      # ESLint check
npm run lint:fix  # ESLint auto-fix
```

---

## Jam Session Architecture

### Leader-Follower Model

ChordShift uses a **leader-follower architecture** for real-time jam sessions:

1. **Leader** (host) creates a lobby with a 4-character code
2. **Followers** join using the code (no authentication required)
3. Leader's state (chord sheet, transposition, scroll position) is the **source of truth**
4. All state changes broadcast instantly via Socket.io to all followers

### Socket.io Events

**Client → Server:**
| Event | Payload | Description |
| --- | --- | --- |
| `lobby:create` | `{ displayName, initialState? }` | Create a new lobby, returns 4-char code |
| `lobby:join` | `{ code, displayName }` | Join existing lobby |
| `lobby:state` | `Partial<LobbyState>` | Leader broadcasts state changes |
| `lobby:leave` | — | Leave the current lobby |

**Server → Client:**
| Event | Payload | Description |
| --- | --- | --- |
| `lobby:created` | `{ code, state, members }` | Lobby created successfully |
| `lobby:joined` | `{ code, state, members, role }` | Successfully joined lobby |
| `lobby:state` | `Partial<LobbyState>` | State update from leader |
| `lobby:members` | `LobbyMember[]` | Member list changed |
| `lobby:closed` | `{ reason }` | Lobby expired or closed |
| `lobby:error` | `{ message }` | Operation failed |

### State Management

**LobbyState:**
```typescript
{
  sheetText: string;        // Current chord sheet content
  semitones: number;        // Leader's transposition (-12 to +12)
  useFlats: boolean;        // Sharp/flat notation preference
  scrollPercent: number;    // Leader's scroll position (0-100)
}
```

**Personal Capo Offset:**
- Followers can apply their own transposition on top of the leader's state
- `capoOffset` is local-only (not broadcast)
- Final displayed transposition = leader's semitones + follower's capoOffset

### Reconnection Handling

- Socket disconnects cache display name and lobby code
- On reconnect, automatically rejoin the same lobby
- Leader's state is preserved and rebroadcast to rejoining clients
- Followers receive full state sync on reconnection

### Lobby Cleanup

- Lobbies auto-expire after **4 hours** of creation
- Cleanup runs every **5 minutes**
- All members receive `lobby:closed` event before cleanup
- In-memory store (no database persistence)

### Security & Validation

**Input Validation:**
- Display names limited to 32 characters (explicit error on overflow)
- Chord sheet text limited to 100KB (prevents memory exhaustion)
- Transposition range clamped to ±12 semitones
- Scroll position validated as 0-100%
- All state updates validated before broadcast

**Rate Limiting:**
- State updates debounced on client (300ms)
- Scroll updates throttled (100ms)
- Prevents server overload from rapid client updates

**Lobby Code Security:**
- 4-character alphanumeric codes (1.67M possible combinations)
- Collision detection (retries if code exists)
- No predictable patterns (fully random)

---

## Architecture Notes

### Chord Detection

`ChordTransformationService` uses a regex to find chord tokens (`[A-G][#b]?` + optional quality suffix). A line is only transposed if at least **50% of its whitespace-separated tokens** look like chord names — this prevents transposing words inside lyric lines. A small exclusion list (`Be`, `Add`, `Bag`, etc.) catches common English words that match the chord pattern.

### Design Patterns

- **Strategy** — `SemitoneTransposer` and `CapoTransposer` both implement `TranspositionStrategy`. `TransformationFactory` selects the right one at request time.
- **Composite** — `ChordProgression` (composite) and `Chord` (leaf) both implement `ChordComponent`, allowing uniform `transpose()` calls.
- **Factory** — `TransformationFactory.createStrategy(type)` is the single place where strategies are instantiated.

### Sharp / Flat Logic

The app decides once per sheet whether to use sharp or flat notation, keeping all chords consistent. Unambiguously flat destinations (F, Bb, Eb, Ab) always use flats. For the two enharmonic ambiguities — Db/C# and Gb/F# — the notation is inherited from the source key. The user can override everything with the `useFlats` toggle.

### Auth Flow

1. Frontend signs in via Supabase Google OAuth.
2. `AuthContext` holds the session; `App.tsx` calls `setAuthToken(session.access_token)` to keep the API client in sync.
3. All `/sheets` requests send `Authorization: Bearer <jwt>`.
4. `requireAuth` middleware validates the JWT against Supabase and attaches `req.userId`.

---

## Deployment

### Frontend (GitHub Pages)

```bash
cd frontend
npm run deploy    # runs: tsc && vite build && gh-pages -d dist
```

Vite is configured with `base: '/chord-shift/'` to match the GitHub Pages subpath.

### Backend

```bash
docker build -f backend/Dockerfile -t chord-shift-backend .
docker run -p 5001:5001 --env-file backend/.env chord-shift-backend
```

**Important Configuration:**

1. Set `VITE_API_URL` in the frontend production environment to point at your deployed backend URL
2. Update **both** CORS origin lists in `backend/src/index.ts`:
   - Express CORS (REST API)
   - Socket.io CORS (WebSocket connections)
3. Both must include your production frontend domain (e.g., `https://andytule.github.io`)

```typescript
const allowedOrigins = [
  'https://andytule.github.io',        // GitHub Pages
  'https://yourdomain.com',            // Custom domain
  'http://localhost:5173',             // Local dev
];

// Express CORS
app.use(cors({ origin: allowedOrigins }));

// Socket.io CORS
const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});
```

---

## Testing

```bash
cd backend
npm test                  # run all tests
npm run test:watch        # re-run on file save
npm run test:coverage     # run with coverage report
```

| File                                 | What it covers                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `SemitoneTransposer.test.ts`         | Chromatic scale, sharp/flat output, chord quality suffixes, altered extensions (m7b5, maj7#11, 7b9), slash chords                 |
| `CapoTransposer.test.ts`             | Transposition direction, quality preservation, common guitar keys                                                                 |
| `ChordTransformationService.test.ts` | Chord line detection, progressions, altered chords, flat/sharp preference, `detectKey`, excluded words, formatting, capo strategy |
| `api.test.ts`                        | Every endpoint — happy paths, validation errors, Supabase error propagation                                                       |

Supabase is mocked via a thenable chain so tests run without a live database. `requireAuth` is mocked to inject a fixed `userId`.

**Note:** Socket.io lobby handlers are tested manually. Integration tests for WebSocket events would go in `lobby/handlers.test.ts`.

---

## NPM Scripts

### Backend

| Script                  | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Start dev server with nodemon + ts-node |
| `npm run build`         | Compile TypeScript to `dist/`           |
| `npm run start`         | Run compiled output                     |
| `npm run lint`          | ESLint check                            |
| `npm run lint:fix`      | ESLint auto-fix                         |
| `npm run format`        | Prettier write                          |
| `npm test`              | Run all tests                           |
| `npm run test:watch`    | Re-run tests on file save               |
| `npm run test:coverage` | Run tests with coverage report          |

### Frontend

| Script             | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Vite dev server                    |
| `npm run build`    | Type-check + Vite build to `dist/` |
| `npm run preview`  | Preview production build locally   |
| `npm run deploy`   | Build + push to `gh-pages` branch  |
| `npm run lint`     | ESLint check                       |
| `npm run lint:fix` | ESLint auto-fix                    |
| `npm run format`   | Prettier write                     |
