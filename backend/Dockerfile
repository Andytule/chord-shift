# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root-level shared types so the TypeScript compiler can resolve them
COPY types/ ../types/

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5001

CMD ["node", "dist/backend/src/index.js"]
