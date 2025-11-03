#!/bin/bash

# Quick Deploy Script for Inventory Management System
# This script provides various deployment options

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Inventory Management System Deploy${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "Docker is installed"
}

check_env_files() {
    print_info "Checking environment files..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_warning ".env file not found, creating from example..."
        cp .env.example .env
        print_info "Please edit .env file with your configuration"
    fi
    
    if [[ ! -f "inventory-backend/.env.local" ]]; then
        print_warning "Backend .env.local not found"
        if [[ -f "inventory-backend/.env.production" ]]; then
            cp inventory-backend/.env.production inventory-backend/.env.local
            print_info "Created from .env.production template"
        else
            cp inventory-backend/.env.example inventory-backend/.env.local
            print_info "Created from .env.example template"
        fi
        print_warning "Please configure inventory-backend/.env.local with MongoDB URI"
    fi
    
    if [[ ! -f "inventory-frontend/.env.local" ]]; then
        print_info "Creating frontend .env.local..."
        if [[ -f "inventory-frontend/.env.production" ]]; then
            cp inventory-frontend/.env.production inventory-frontend/.env.local
        else
            cp inventory-frontend/.env.example inventory-frontend/.env.local
        fi
    fi
    
    print_success "Environment files checked"
}

build_services() {
    print_info "Building Docker images..."
    docker-compose build --no-cache
    print_success "Build completed"
}

start_services() {
    print_info "Starting services..."
    docker-compose up -d
    print_success "Services started"
}

stop_services() {
    print_info "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

restart_services() {
    print_info "Restarting services..."
    docker-compose restart
    print_success "Services restarted"
}

show_logs() {
    local service=$1
    if [[ -z "$service" ]]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

show_status() {
    print_info "Service Status:"
    docker-compose ps
    echo ""
    print_info "Network Status:"
    docker network ls | grep inventory
    echo ""
    print_info "Volume Status:"
    docker volume ls | grep inventory
}

cleanup() {
    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (yes/no): " confirm
    if [[ "$confirm" == "yes" ]]; then
        print_info "Cleaning up..."
        docker-compose down -v
        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

deploy_full() {
    print_header
    check_docker
    check_env_files
    
    print_info "Starting full deployment..."
    build_services
    start_services
    
    echo ""
    print_success "Deployment completed!"
    echo ""
    print_info "Access your application at:"
    echo "  Frontend: http://10.0.10.141"
    echo "  Backend API: http://10.0.10.141:3001"
    echo "  MongoDB: localhost:27017"
    echo ""
    print_info "View logs with: $0 logs"
    print_info "Check status with: $0 status"
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy       - Full deployment (build + start)"
    echo "  build        - Build Docker images"
    echo "  start        - Start services"
    echo "  stop         - Stop services"
    echo "  restart      - Restart services"
    echo "  status       - Show service status"
    echo "  logs [service] - Show logs (optional: specify service)"
    echo "  cleanup      - Remove all containers and volumes"
    echo "  help         - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 deploy                  # Full deployment"
    echo "  $0 logs backend           # View backend logs"
    echo "  $0 restart                # Restart all services"
}

# Main script
case "${1:-deploy}" in
    "deploy")
        deploy_full
        ;;
    "build")
        print_header
        check_docker
        build_services
        ;;
    "start")
        print_header
        check_docker
        start_services
        ;;
    "stop")
        print_header
        stop_services
        ;;
    "restart")
        print_header
        restart_services
        ;;
    "status")
        print_header
        show_status
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    "cleanup")
        print_header
        cleanup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
