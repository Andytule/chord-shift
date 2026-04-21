# ChordShift

A full-stack chord transposition web app. Users paste a chord sheet (mixed lyrics + chords), transpose it up/down by semitone or capo position, toggle sharp/flat notation, and save sheets to their account.

**Live:** https://andytule.github.io/chord-shift/  
**Backend:** Express API on port 5001  
**Auth + DB:** Supabase (Google OAuth, `chord_sheets` table)

---

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 8, SCSS        |
| Backend    | Node.js, Express 5, TypeScript, ts-node   |
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
│   │   │   ├── sheets/         # SheetList (saved sheets grid)
│   │   │   └── ui/             # Toast, ConfirmModal
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Supabase session + user
│   │   ├── lib/
│   │   │   └── supabase.ts     # Supabase client (anon key)
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
│   │   ├── index.ts            # App bootstrap, CORS, route mounting
│   │   ├── env.ts              # dotenv.config() — imported first in index.ts
│   │   ├── routes/
│   │   │   ├── transpose.ts    # POST /transpose — stateless chord transformation
│   │   │   └── sheets.ts       # CRUD /sheets — all routes require JWT
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

## Docker

Both services are fully containerised. The frontend is served by nginx; the backend runs compiled JavaScript on Node.

### Run with docker-compose

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env

docker-compose up --build
```

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5001 |

### Build images individually

```bash
# Backend (run from repo root)
docker build -f backend/Dockerfile -t chord-shift-backend .

# Frontend (run from repo root)
docker build -f frontend/Dockerfile \
  --build-arg VITE_SUPABASE_URL=https://<project>.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=<anon_key> \
  --build-arg VITE_API_URL=http://localhost:5001 \
  -t chord-shift-frontend .
```

> **Note:** Both Dockerfiles use the repo root as build context so the backend image can access the shared `types/` directory.

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
```

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

Set `VITE_API_URL` in the frontend production environment to point at the deployed backend URL. Update the `cors` origin list in `backend/src/index.ts` to include your production frontend domain.

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
