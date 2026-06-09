.PHONY: help format-code lint build dev run-tests test-watch test-coverage deploy

help:
	@echo "Backend Commands"
	@echo "================"
	@echo ""
	@echo "  make dev              - Start dev server with hot-reload (port 5001)"
	@echo "  make build            - Compile TypeScript to JavaScript"
	@echo "  make lint             - Check code style"
	@echo "  make format-code      - Format and fix lint issues"
	@echo "  make run-tests        - Run tests once"
	@echo "  make test-watch       - Run tests in watch mode"
	@echo "  make test-coverage    - Run tests with coverage report"
	@echo "  make deploy           - Trigger Render deployment"
	@echo ""

# ── Local Development ──────────────────────────────────────────────────────────
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
