# Makefile for Inventory Management System
# Simplified command interface

.PHONY: help install build dev start stop restart logs clean deploy test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd inventory-backend && npm install
	@echo "Installing frontend dependencies..."
	cd inventory-frontend && npm install
	@echo "✓ Dependencies installed"

build: ## Build both frontend and backend
	@echo "Building backend..."
	cd inventory-backend && npm run build
	@echo "Building frontend..."
	cd inventory-frontend && npm run build
	@echo "✓ Build completed"

dev-backend: ## Start backend in development mode
	cd inventory-backend && npm run dev

dev-frontend: ## Start frontend in development mode
	cd inventory-frontend && npm run dev

dev: ## Start both in development mode (parallel)
	@echo "Starting development servers..."
	@make -j2 dev-backend dev-frontend

start: ## Start production services with Docker
	@echo "Starting services..."
	docker-compose up -d
	@echo "✓ Services started"

stop: ## Stop all services
	@echo "Stopping services..."
	docker-compose down
	@echo "✓ Services stopped"

restart: ## Restart all services
	@echo "Restarting services..."
	docker-compose restart
	@echo "✓ Services restarted"

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs only
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs only
	docker-compose logs -f frontend

status: ## Show service status
	docker-compose ps

deploy: ## Deploy to production
	@echo "Deploying to production..."
	./quick-deploy.sh deploy

deploy-prod: ## Full production deployment
	@echo "Running production deployment..."
	./production-deploy.sh

health: ## Run health checks
	@echo "Running health checks..."
	./health-check.sh

test: ## Run tests
	@echo "Running backend tests..."
	cd inventory-backend && npm test

test-watch: ## Run tests in watch mode
	cd inventory-backend && npm run test:watch

clean: ## Clean build artifacts and dependencies
	@echo "Cleaning..."
	rm -rf inventory-backend/node_modules
	rm -rf inventory-backend/.next
	rm -rf inventory-frontend/node_modules
	rm -rf inventory-frontend/dist
	@echo "✓ Cleaned"

backup: ## Create backup
	@echo "Creating backup..."
	mkdir -p backups
	tar -czf backups/backup-$$(date +%Y%m%d-%H%M%S).tar.gz \
		--exclude=node_modules \
		--exclude=.next \
		--exclude=dist \
		inventory-backend/.env.local \
		inventory-frontend/.env.local \
		.env
	@echo "✓ Backup created in backups/"

docker-build: ## Build Docker images
	docker-compose build

docker-rebuild: ## Rebuild Docker images from scratch
	docker-compose build --no-cache

docker-clean: ## Clean Docker resources
	docker-compose down -v
	docker system prune -f

setup-env: ## Setup environment files
	@echo "Setting up environment files..."
	@test -f .env || cp .env.example .env
	@test -f inventory-backend/.env.local || cp inventory-backend/.env.example inventory-backend/.env.local
	@test -f inventory-frontend/.env.local || cp inventory-frontend/.env.example inventory-frontend/.env.local
	@echo "✓ Environment files created"
	@echo "Please edit the .env files with your configuration"

init: setup-env install ## Initial setup (environment + dependencies)
	@echo "✓ Initial setup completed"
	@echo "Next steps:"
	@echo "  1. Edit .env files with your configuration"
	@echo "  2. Run 'make build' to build the applications"
	@echo "  3. Run 'make deploy' or 'make dev' to start"

pm2-start: ## Start backend with PM2
	cd inventory-backend && pm2 start npm --name "inventory-backend" -- start
	pm2 save

pm2-stop: ## Stop PM2 process
	pm2 stop inventory-backend

pm2-restart: ## Restart PM2 process
	pm2 restart inventory-backend

pm2-logs: ## Show PM2 logs
	pm2 logs inventory-backend

pm2-status: ## Show PM2 status
	pm2 status

update: ## Pull latest code and rebuild
	git pull origin main
	make install
	make build
	@echo "✓ Updated successfully"

# Default target
.DEFAULT_GOAL := help
