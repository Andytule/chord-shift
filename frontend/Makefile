.PHONY: format-code lint build dev docker-build docker-up docker-down docker-logs deploy

# ── Local dev (no Docker) ──────────────────────────────────────────────────────
format-code:
	npm run format
	npm run lint:fix

lint:
	npm run lint

build:
	npm run build

dev:
	npm run dev

# ── Docker (local development) ────────────────────────────────────────────────
# Builds the frontend image only (uses build args from root .env)
docker-build:
	docker compose -f ../docker-compose.yml build frontend

# Start frontend container (also starts backend if not already running)
docker-up:
	docker compose -f ../docker-compose.yml up frontend

# Stop and remove frontend container
docker-down:
	docker compose -f ../docker-compose.yml down

# Tail frontend container logs
docker-logs:
	docker compose -f ../docker-compose.yml logs -f frontend

# ── Deploy to GitHub Pages ────────────────────────────────────────────────────
deploy:
	npm run build
	npm run deploy
