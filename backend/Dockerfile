# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine3.22 AS builder

# Replicate repo layout so tsconfig rootDir: "../" resolves correctly:
#   /build/types/     ← shared types (repo root)
#   /build/backend/   ← source + tsconfig
WORKDIR /build

COPY types/ ./types/
COPY backend/package*.json ./backend/
RUN npm ci --prefix ./backend

COPY backend/ ./backend/

# With rootDir: "../", tsc output mirrors the full tree:
#   /build/backend/dist/backend/src/index.js
RUN npm run build --prefix ./backend

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine3.22 AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /build/backend/package*.json ./
RUN npm ci --omit=dev

# dist/backend/src/index.js is the entry point
COPY --from=builder /build/backend/dist ./dist

EXPOSE 5001

CMD ["node", "dist/backend/src/index.js"]
