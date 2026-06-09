# ============================================================================
# ChordShift Makefile
# ============================================================================
# Convenience commands for local development and Docker operations
#
# Common commands:
#   make dev             - Start local dev (backend + frontend in separate terminals)
#   make docker          - Build and run production Docker containers
#   make clean           - Stop and remove all containers, networks, volumes
# ============================================================================

.PHONY: help dev dev-backend dev-frontend install docker docker-logs docker-stop clean lint test

# Default target
help:
	@echo "ChordShift Development Commands"
	@echo "================================"
	@echo ""
	@echo "Local Development:"
	@echo "  make install        - Install dependencies (backend + frontend)"
	@echo "  make dev           - Instructions for running dev servers"
	@echo "  make dev-backend   - Start backend dev server (port 5001)"
	@echo "  make dev-frontend  - Start frontend dev server (port 5173)"
	@echo ""
	@echo "Docker (Production):"
	@echo "  make docker        - Build and run production containers"
	@echo "  make docker-logs   - Follow Docker logs"
	@echo "  make docker-stop   - Stop all containers"
	@echo "  make clean         - Stop containers and clean up volumes"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          - Run linters (backend + frontend)"
	@echo "  make lint-fix      - Auto-fix linting issues"
	@echo "  make format        - Format code with Prettier"
	@echo "  make test          - Run backend tests"
	@echo ""
	@echo "Service-Specific Commands:"
	@echo "  cd backend && make help    - Backend-specific commands"
	@echo "  cd frontend && make help   - Frontend-specific commands"
	@echo ""

# ── Local Development ───────────────────────────────────────────────────────

install:
	@echo "📦 Installing dependencies..."
	cd backend && npm install
	cd frontend && npm install
	@echo "✅ Dependencies installed!"

dev:
	@echo ""
	@echo "🚀 Local Development Setup"
	@echo "=========================="
	@echo ""
	@echo "Run these commands in separate terminals:"
	@echo ""
	@echo "Terminal 1 (Backend):"
	@echo "  cd backend && npm run dev"
	@echo ""
	@echo "Terminal 2 (Frontend):"
	@echo "  cd frontend && npm run dev"
	@echo ""
	@echo "Or use:"
	@echo "  make dev-backend    (in terminal 1)"
	@echo "  make dev-frontend   (in terminal 2)"
	@echo ""

dev-backend:
	@echo "🔧 Starting backend dev server..."
	cd backend && npm run dev

dev-frontend:
	@echo "⚡ Starting frontend dev server..."
	cd frontend && npm run dev

# ── Docker (Production Only) ────────────────────────────────────────────────

docker:
	@echo "🐳 Building and starting production containers..."
	docker-compose up --build

docker-logs:
	docker-compose logs -f

docker-stop:
	@echo "🛑 Stopping containers..."
	docker-compose down

clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v
	@echo "✅ Cleanup complete!"

# ── Code Quality ────────────────────────────────────────────────────────────

lint:
	@echo "🔍 Running linters..."
	cd backend && npm run lint
	cd frontend && npm run lint

lint-fix:
	@echo "🔧 Auto-fixing lint issues..."
	cd backend && npm run lint:fix
	cd frontend && npm run lint:fix

format:
	@echo "✨ Formatting code..."
	cd backend && npm run format
	cd frontend && npm run format

test:
	@echo "🧪 Running backend tests..."
	cd backend && npm test

test-watch:
	@echo "🧪 Running backend tests in watch mode..."
	cd backend && npm run test:watch

test-coverage:
	@echo "📊 Running backend tests with coverage..."
	cd backend && npm run test:coverage
