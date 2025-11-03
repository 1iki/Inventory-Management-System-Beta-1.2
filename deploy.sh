#!/bin/bash

# Production Deployment Script for Inventory System
# Usage: ./deploy.sh [frontend|backend|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="inventory-backend"
FRONTEND_DIR="inventory-frontend"
NODE_VERSION="18"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_CURRENT=$(node -v | sed 's/v//')
    if [[ $(echo "$NODE_CURRENT < $NODE_VERSION" | bc -l) -eq 1 ]]; then
        log_error "Node.js version $NODE_VERSION or higher required. Current: $NODE_CURRENT"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check MongoDB connection (for backend)
    if [[ "$1" == "backend" || "$1" == "all" ]]; then
        if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
            log_warning "MongoDB client not found. Make sure MongoDB is accessible."
        fi
    fi
    
    log_success "Prerequisites check passed"
}

deploy_backend() {
    log_info "Deploying backend..."
    
    cd "$BACKEND_DIR"
    
    # Check environment file
    if [[ ! -f ".env.local" ]]; then
        log_error "Backend .env.local file not found"
        log_info "Copy .env.example to .env.local and configure it"
        exit 1
    fi
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm ci --only=production
    
    # Build application
    log_info "Building backend..."
    npm run build
    
    # Run database seed if needed
    if [[ "$SEED_DB" == "true" ]]; then
        log_info "Seeding database..."
        npm run seed
    fi
    
    # Test database connection
    log_info "Testing database connection..."
    npm run test-db
    
    cd ..
    log_success "Backend deployment completed"
}

deploy_frontend() {
    log_info "Deploying frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Check environment file
    if [[ ! -f ".env.local" ]]; then
        log_warning "Frontend .env.local file not found, using .env.example"
        cp .env.example .env.local
    fi
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci --only=production
    
    # Build application
    log_info "Building frontend..."
    npm run build
    
    # Check build output
    if [[ ! -d "dist" ]]; then
        log_error "Frontend build failed - dist directory not found"
        exit 1
    fi
    
    log_info "Frontend build size:"
    du -sh dist/
    
    cd ..
    log_success "Frontend deployment completed"
}

deploy_all() {
    log_info "Starting full deployment..."
    deploy_backend
    deploy_frontend
    log_success "Full deployment completed"
}

start_services() {
    log_info "Starting services..."
    
    # Start backend
    cd "$BACKEND_DIR"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run start &
        BACKEND_PID=$!
        log_info "Backend started with PID: $BACKEND_PID"
    else
        npm run dev &
        BACKEND_PID=$!
        log_info "Backend started in development mode with PID: $BACKEND_PID"
    fi
    cd ..
    
    # Frontend is served as static files in production
    # In development, you would run: npm run dev
    
    log_success "Services started successfully"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Kill background processes
    if [[ ! -z "$BACKEND_PID" ]]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    log_success "Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
case "${1:-all}" in
    "backend")
        check_prerequisites "backend"
        deploy_backend
        ;;
    "frontend")
        check_prerequisites "frontend"
        deploy_frontend
        ;;
    "all")
        check_prerequisites "all"
        deploy_all
        ;;
    "start")
        start_services
        ;;
    *)
        log_error "Usage: $0 [backend|frontend|all|start]"
        exit 1
        ;;
esac

log_success "Deployment script completed successfully!"

# Environment-specific instructions
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo ""
    log_info "Production deployment notes:"
    echo "1. Configure reverse proxy (nginx/apache) to serve frontend static files"
    echo "2. Set up SSL certificates for HTTPS"
    echo "3. Configure environment variables for production"
    echo "4. Set up monitoring and logging"
    echo "5. Configure backup strategy for database"
else
    echo ""
    log_info "Development deployment completed"
    echo "Backend: http://localhost:3001"
    echo "Frontend: http://localhost:5173"
fi