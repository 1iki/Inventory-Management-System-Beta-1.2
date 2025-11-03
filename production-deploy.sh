#!/bin/bash

# Production Deployment Script
# Automated deployment with safety checks

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="backups"
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root is not recommended"
        read -p "Continue? (yes/no): " confirm
        [[ "$confirm" != "yes" ]] && exit 1
    fi
    
    # Check disk space
    available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [[ $available_space -lt 5 ]]; then
        error "Insufficient disk space. Need at least 5GB, have ${available_space}GB"
        exit 1
    fi
    success "Disk space check passed (${available_space}GB available)"
    
    # Check if ports are available
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        warning "Port 3001 is already in use"
        read -p "Kill existing process? (yes/no): " confirm
        if [[ "$confirm" == "yes" ]]; then
            lsof -ti:3001 | xargs kill -9
            success "Process killed"
        fi
    fi
    
    # Check environment files
    if [[ ! -f "inventory-backend/.env.local" ]]; then
        error "Backend .env.local not found!"
        exit 1
    fi
    
    if [[ ! -f "inventory-frontend/.env.local" ]]; then
        warning "Frontend .env.local not found, will use .env.production"
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    backup_file="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=dist \
        --exclude=logs \
        inventory-backend/.env.local \
        inventory-frontend/.env.local \
        .env 2>/dev/null || true
    
    success "Backup created: $backup_file"
}

# Build backend
build_backend() {
    log "Building backend..."
    cd inventory-backend
    
    # Install dependencies
    log "Installing backend dependencies..."
    npm ci --only=production
    
    # Build
    log "Building backend application..."
    npm run build
    
    cd ..
    success "Backend build completed"
}

# Build frontend
build_frontend() {
    log "Building frontend..."
    cd inventory-frontend
    
    # Install dependencies
    log "Installing frontend dependencies..."
    npm ci --only=production
    
    # Build
    log "Building frontend application..."
    npm run build
    
    # Check build output
    if [[ ! -d "dist" ]]; then
        error "Frontend build failed!"
        exit 1
    fi
    
    build_size=$(du -sh dist | cut -f1)
    success "Frontend build completed (Size: $build_size)"
    
    cd ..
}

# Deploy backend with PM2
deploy_backend_pm2() {
    log "Deploying backend with PM2..."
    
    cd inventory-backend
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        npm install -g pm2
    fi
    
    # Stop existing instance
    pm2 stop inventory-backend 2>/dev/null || true
    pm2 delete inventory-backend 2>/dev/null || true
    
    # Start new instance
    pm2 start npm --name "inventory-backend" -- start
    pm2 save
    
    cd ..
    success "Backend deployed with PM2"
}

# Deploy frontend to nginx
deploy_frontend_nginx() {
    log "Deploying frontend to nginx..."
    
    web_root="/var/www/html/inventory"
    
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        error "Nginx is not installed"
        log "Install with: sudo apt install nginx"
        exit 1
    fi
    
    # Create web root
    sudo mkdir -p "$web_root"
    
    # Copy files
    log "Copying files to $web_root..."
    sudo cp -r inventory-frontend/dist/* "$web_root/"
    
    # Set permissions
    sudo chown -R www-data:www-data "$web_root"
    sudo chmod -R 755 "$web_root"
    
    # Test nginx config
    sudo nginx -t
    
    # Reload nginx
    sudo systemctl reload nginx
    
    success "Frontend deployed to nginx"
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
    # Wait for services to start
    sleep 5
    
    # Test backend
    log "Testing backend..."
    backend_health=$(curl -s http://localhost:3001/api/health || echo "failed")
    if [[ "$backend_health" == *"ok"* ]] || [[ "$backend_health" == *"healthy"* ]]; then
        success "Backend is healthy"
    else
        error "Backend health check failed"
    fi
    
    # Test frontend
    log "Testing frontend..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        success "Frontend is accessible"
    else
        warning "Frontend may not be accessible"
    fi
    
    success "Deployment tests completed"
}

# Show deployment info
show_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Completed Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "  Backend:  http://$(hostname -I | awk '{print $1}'):3001"
    echo ""
    echo "Monitoring:"
    echo "  PM2 Dashboard: pm2 monit"
    echo "  Backend Logs:  pm2 logs inventory-backend"
    echo "  Nginx Logs:    tail -f /var/log/nginx/access.log"
    echo ""
    echo "Management:"
    echo "  Restart Backend:  pm2 restart inventory-backend"
    echo "  Stop Backend:     pm2 stop inventory-backend"
    echo "  Reload Nginx:     sudo systemctl reload nginx"
    echo ""
    echo "Log file: $LOG_FILE"
    echo ""
}

# Rollback function
rollback() {
    error "Deployment failed! Rolling back..."
    
    # Stop services
    pm2 stop inventory-backend 2>/dev/null || true
    
    # Restore from latest backup
    latest_backup=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)
    if [[ -n "$latest_backup" ]]; then
        log "Restoring from backup: $latest_backup"
        tar -xzf "$latest_backup"
        success "Backup restored"
    fi
    
    error "Rollback completed. Please check the logs."
    exit 1
}

# Trap errors
trap rollback ERR

# Main deployment flow
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Production Deployment Started${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    pre_deployment_checks
    create_backup
    build_backend
    build_frontend
    deploy_backend_pm2
    
    # Ask about nginx deployment
    read -p "Deploy frontend to nginx? (yes/no): " deploy_nginx
    if [[ "$deploy_nginx" == "yes" ]]; then
        deploy_frontend_nginx
    fi
    
    test_deployment
    show_info
}

# Run main function
main "$@"
