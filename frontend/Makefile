.PHONY: help format-code lint build dev deploy

help:
	@echo "Frontend Commands"
	@echo "================="
	@echo ""
	@echo "  make dev           - Start Vite dev server (port 5173)"
	@echo "  make build         - Build for production"
	@echo "  make lint          - Check code style"
	@echo "  make format-code   - Format and fix lint issues"
	@echo "  make deploy        - Deploy to GitHub Pages"
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

# ── Deploy to GitHub Pages ────────────────────────────────────────────────────
deploy:
	npm run build
	npm run deploy
