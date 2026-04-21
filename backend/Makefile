.PHONY: format-code lint build dev run-tests docker-build docker-up docker-down docker-logs deploy

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

run-tests:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

# ── Docker (local development) ────────────────────────────────────────────────
# Builds the backend image only
docker-build:
	docker compose -f ../docker-compose.yml build backend

# Start backend container in foreground
docker-up:
	docker compose -f ../docker-compose.yml up backend

# Stop and remove backend container
docker-down:
	docker compose -f ../docker-compose.yml down

# Tail backend container logs
docker-logs:
	docker compose -f ../docker-compose.yml logs -f backend

# ── Deploy to Render ──────────────────────────────────────────────────────────
# Trigger a manual Render deploy via the Render Deploy Hook URL.
# Set RENDER_DEPLOY_HOOK in your environment or shell before running.
# e.g. export RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxxx?key=yyyy
deploy:
	@if [ -z "$$RENDER_DEPLOY_HOOK" ]; then \
		echo "Error: RENDER_DEPLOY_HOOK is not set."; \
		echo "Find it in Render Dashboard → your service → Settings → Deploy Hook."; \
		exit 1; \
	fi
	curl -s "$$RENDER_DEPLOY_HOOK" && echo "Deploy triggered on Render."
