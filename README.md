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
| Deployment | GitHub Pages (frontend), manual (backend) |

---

## Project Structure

```
chord-shift/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── App.tsx         # Root component — view state, all handlers
│   │   ├── api/
│   │   │   └── client.ts   # All fetch calls + auth token management
│   │   ├── components/
│   │   │   ├── auth/       # LoginPage (Google OAuth via Supabase)
│   │   │   ├── editor/     # ChordSheetEditor (textarea), TransposeControls
│   │   │   ├── sheets/     # SheetList (saved sheets grid)
│   │   │   └── ui/         # Toast, ConfirmModal
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Supabase session + user
│   │   ├── lib/
│   │   │   └── supabase.ts      # Supabase client (anon key)
│   │   └── styles/
│   │       ├── abstracts/  # SCSS variables
│   │       ├── base/       # Global resets
│   │       └── main.scss   # Entry — imports all partials
│   ├── .env                # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
│   └── vite.config.ts      # base: '/chord-shift/'
│
├── backend/                # Express REST API
│   ├── src/
│   │   ├── index.ts        # App bootstrap, CORS, route mounting
│   │   ├── env.ts          # dotenv.config() — imported first in index.ts
│   │   ├── routes/
│   │   │   ├── transpose.ts  # POST /transpose — stateless chord transformation
│   │   │   └── sheets.ts     # CRUD /sheets — all routes require JWT
│   │   ├── __tests__/
│   │   │   ├── SemitoneTransposer.test.ts
│   │   │   ├── CapoTransposer.test.ts
│   │   │   ├── ChordTransformationService.test.ts
│   │   │   └── api.test.ts
│   │   ├── middleware/
│   │   │   └── requireAuth.ts  # Validates Supabase Bearer JWT, sets req.userId
│   │   ├── services/
│   │   │   ├── ChordTransformationService.ts  # Orchestration: parse → transform → reconstruct
│   │   │   └── TransformationFactory.ts       # Factory: 'semitone' | 'capo' → strategy
│   │   └── lib/
│   │       ├── chord/
│   │       │   ├── ChordComponent.ts    # Interface (Composite pattern)
│   │       │   ├── Chord.ts             # Leaf — single chord token
│   │       │   └── ChordProgression.ts  # Composite — collection of chords
│   │       └── transposers/
│   │           ├── TranspositionStrategy.ts  # Interface (Strategy pattern)
│   │           ├── SemitoneTransposer.ts     # Transposes by N semitones
│   │           └── CapoTransposer.ts         # Transposes DOWN by capo fret (wraps Semitone)
│   └── .env                # SUPABASE_URL, SUPABASE_ANON_KEY, PORT
│
└── types/
    └── supabase.ts         # Generated Supabase database types (shared)
```

---

## Local Development

### Prerequisites

- Node.js 18+
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
VITE_API_URL=http://localhost:5001   # omit in production (defaults to localhost:5001)
```

---

## API Reference

### `POST /transpose`

Stateless — transposes a chord sheet in memory, returns the result. No auth required.

**Request body:**

| Field       | Type                     | Required | Description                                                                              |
| ----------- | ------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| `sheetText` | string                   | ✓        | Full chord sheet (mixed lyrics + chords)                                                 |
| `semitones` | number                   |          | Semitones to shift (positive = up, negative = down). Used when `strategy` is `semitone`. |
| `strategy`  | `"semitone"` \| `"capo"` |          | Defaults to `"semitone"`                                                                 |
| `capoFret`  | number                   |          | Fret position. Used when `strategy` is `"capo"`.                                         |
| `useFlats`  | boolean                  |          | Override sharp/flat preference for all chords in the sheet                               |

**Response:**

```json
{
  "transposedText": "...",
  "originalChords": ["G", "D", "Em"],
  "transposedChords": ["A", "E", "F#m"],
  "detectedKey": "G"
}
```

---

### `GET /sheets`

Returns the 20 most recent sheets for the authenticated user.

### `GET /sheets/:id`

Returns a single sheet by ID (must belong to the authenticated user).

### `POST /sheets`

Body: `{ name: string, sheet_text: string, key?: string }`

### `PUT /sheets/:id`

Body: `{ name?: string, sheet_text: string, key?: string }`

### `DELETE /sheets/:id`

All `/sheets` routes require `Authorization: Bearer <supabase_jwt>`.

---

## Architecture Notes

### Chord Detection

`ChordTransformationService` uses a regex to find chord tokens (`[A-G][#b]?` + optional quality suffix). A line is only transposed if at least **50% of its whitespace-separated tokens** look like chord names — this prevents transposing words inside lyric lines. A small exclusion list (`Be`, `Add`, `Bag`, etc.) catches common English words that match the chord pattern.

### Design Patterns

- **Strategy** — `SemitoneTransposer` and `CapoTransposer` both implement `TranspositionStrategy`. `TransformationFactory` selects the right one at request time.
- **Composite** — `ChordProgression` (composite) and `Chord` (leaf) both implement `ChordComponent`, allowing uniform `transpose()` calls.
- **Factory** — `TransformationFactory.createStrategy(type)` is the single place where strategies are instantiated.

### Sharp / Flat Logic

The app decides once per sheet whether to use sharp or flat notation, keeping all chords consistent. Unambiguously flat destinations (F, Bb, Eb, Ab) always use flats. For the two enharmonic ambiguities — Db/C# and Gb/F# — the notation is inherited from the source key: a sharp-flavoured source (e.g. E, B, A) landing on index 6 produces F#, while a flat-flavoured source (e.g. Gb, Db) produces Gb. The user can override everything with the `useFlats` toggle.

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

No automated deployment is configured. The backend must be hosted separately (e.g. Railway, Render, Fly.io). Set `VITE_API_URL` in the frontend production environment to point at the deployed backend URL.

CORS is currently allowed for `https://andytule.github.io` and `http://localhost:5173`.

---

## Testing

The backend has a full Jest test suite covering unit and integration tests.

```bash
cd backend
npm test                  # run all tests
npm run test:watch        # re-run on file save
npm run test:coverage     # run with coverage report
make run-tests            # via Makefile
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
| `npm run lint`          | ESLint                                  |
| `npm run format`        | Prettier                                |
| `npm test`              | Run all tests                           |
| `npm run test:watch`    | Re-run tests on file save               |
| `npm run test:coverage` | Run tests with coverage report          |

### Frontend

| Script            | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Vite dev server                    |
| `npm run build`   | Type-check + Vite build to `dist/` |
| `npm run preview` | Preview production build locally   |
| `npm run deploy`  | Build + push to `gh-pages` branch  |
| `npm run lint`    | ESLint                             |
| `npm run format`  | Prettier                           |
