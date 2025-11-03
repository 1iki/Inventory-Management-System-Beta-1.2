#!/bin/bash

# Deployment Summary and Status
# Shows current deployment configuration and status

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║        ${MAGENTA}📦 INVENTORY MANAGEMENT SYSTEM DEPLOYMENT${CYAN}         ║${NC}"
echo -e "${CYAN}║                      ${GREEN}Version 1.2${CYAN}                              ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# System Information
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 SYSTEM INFORMATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}Server IP:${NC}      ${YELLOW}$SERVER_IP${NC}"
echo -e "${GREEN}Hostname:${NC}       $(hostname)"
echo -e "${GREEN}OS:${NC}             $(lsb_release -d | cut -f2)"
echo -e "${GREEN}Node.js:${NC}        $(node -v 2>/dev/null || echo 'Not installed')"
echo -e "${GREEN}npm:${NC}            $(npm -v 2>/dev/null || echo 'Not installed')"
echo -e "${GREEN}Docker:${NC}         $(docker --version 2>/dev/null | cut -d' ' -f3 | sed 's/,//' || echo 'Not installed')"
echo ""

# Configuration Status
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ⚙️  CONFIGURATION STATUS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check environment files
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 ${RED}(Missing)${NC}"
        return 1
    fi
}

check_file ".env" "Root environment file"
check_file "inventory-backend/.env.local" "Backend environment file"
check_file "inventory-frontend/.env.local" "Frontend environment file"
check_file "docker-compose.yml" "Docker Compose configuration"
check_file "ecosystem.config.js" "PM2 configuration"
echo ""

# MongoDB Configuration
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🗄️  DATABASE CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -f "inventory-backend/.env.local" ]; then
    if grep -q "MONGODB_URI=mongodb+srv://" inventory-backend/.env.local && \
       ! grep -q "MONGODB_URI=mongodb+srv://<username>" inventory-backend/.env.local; then
        echo -e "${GREEN}✓${NC} MongoDB Atlas: ${GREEN}Configured${NC}"
        MONGO_URI=$(grep "MONGODB_URI=" inventory-backend/.env.local | head -1 | cut -d'=' -f2)
        MONGO_HOST=$(echo "$MONGO_URI" | sed 's/.*@\([^/]*\).*/\1/')
        echo -e "${GREEN}  Host:${NC} $MONGO_HOST"
    else
        echo -e "${YELLOW}⚠${NC} MongoDB Atlas: ${YELLOW}Not configured${NC}"
        echo -e "  ${YELLOW}Update MONGODB_URI in inventory-backend/.env.local${NC}"
    fi
    
    JWT_SECRET=$(grep "^JWT_SECRET=" inventory-backend/.env.local | cut -d'=' -f2)
    if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "inventory-system-jwt-secret-key-development-2024" ]; then
        echo -e "${GREEN}✓${NC} JWT Secret: ${GREEN}Configured${NC}"
    else
        echo -e "${YELLOW}⚠${NC} JWT Secret: ${YELLOW}Using default (Change for production!)${NC}"
    fi
else
    echo -e "${RED}✗${NC} Backend environment file not found"
fi
echo ""

# API Configuration
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🌐 API CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -f "inventory-frontend/.env.local" ]; then
    API_URL=$(grep "VITE_API_BASE_URL=" inventory-frontend/.env.local | cut -d'=' -f2)
    echo -e "${GREEN}Frontend API URL:${NC} $API_URL"
fi

if [ -f "inventory-backend/.env.local" ]; then
    BACKEND_PORT=$(grep "^PORT=" inventory-backend/.env.local | cut -d'=' -f2)
    echo -e "${GREEN}Backend Port:${NC}     $BACKEND_PORT"
    
    CORS_ORIGINS=$(grep "CORS_ORIGINS=" inventory-backend/.env.local | cut -d'=' -f2)
    echo -e "${GREEN}CORS Origins:${NC}     $CORS_ORIGINS"
fi
echo ""

# Access URLs
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔗 ACCESS URLS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Frontend:${NC}       ${CYAN}http://$SERVER_IP${NC}"
echo -e "${GREEN}Backend API:${NC}    ${CYAN}http://$SERVER_IP:3001${NC}"
echo -e "${GREEN}Health Check:${NC}   ${CYAN}http://$SERVER_IP:3001/api/health${NC}"
echo ""

# Deployment Methods
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 DEPLOYMENT METHODS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}1. Quick Deploy (Docker - Recommended)${NC}"
echo -e "   ${YELLOW}./quick-deploy.sh deploy${NC}"
echo ""
echo -e "${CYAN}2. Production Deploy (PM2 + Nginx)${NC}"
echo -e "   ${YELLOW}./production-deploy.sh${NC}"
echo ""
echo -e "${CYAN}3. Using Makefile${NC}"
echo -e "   ${YELLOW}make deploy${NC}"
echo ""
echo -e "${CYAN}4. Manual Deploy${NC}"
echo -e "   ${YELLOW}cd inventory-backend && npm install && npm run build && npm start${NC}"
echo -e "   ${YELLOW}cd inventory-frontend && npm install && npm run build${NC}"
echo ""

# Quick Commands
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ⚡ QUICK COMMANDS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Test deployment:${NC}     ./test-deployment.sh"
echo -e "${YELLOW}Deploy (Docker):${NC}     ./quick-deploy.sh deploy"
echo -e "${YELLOW}Deploy (Production):${NC} ./production-deploy.sh"
echo -e "${YELLOW}Health check:${NC}        ./health-check.sh"
echo -e "${YELLOW}View logs:${NC}           docker-compose logs -f"
echo -e "${YELLOW}Stop services:${NC}       docker-compose down"
echo -e "${YELLOW}Restart:${NC}             docker-compose restart"
echo ""

# Makefile Commands
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📋 MAKEFILE COMMANDS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}make help${NC}            Show all available commands"
echo -e "${YELLOW}make init${NC}            Initial setup"
echo -e "${YELLOW}make deploy${NC}          Deploy with Docker"
echo -e "${YELLOW}make deploy-prod${NC}     Production deployment"
echo -e "${YELLOW}make dev${NC}             Development mode"
echo -e "${YELLOW}make health${NC}          Run health checks"
echo -e "${YELLOW}make logs${NC}            View logs"
echo -e "${YELLOW}make backup${NC}          Create backup"
echo ""

# Documentation
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📚 DOCUMENTATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Quick Start:${NC}         ${CYAN}QUICKSTART.md${NC}"
echo -e "${GREEN}Full Guide:${NC}          ${CYAN}DEPLOYMENT_GUIDE.md${NC}"
echo -e "${GREEN}Checklist:${NC}           ${CYAN}DEPLOYMENT_CHECKLIST.md${NC}"
echo -e "${GREEN}Completion Status:${NC}   ${CYAN}DEPLOYMENT_COMPLETE.md${NC}"
echo ""

# Service Status
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 SERVICE STATUS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check Docker containers
if command -v docker &> /dev/null; then
    RUNNING_CONTAINERS=$(docker ps --filter "name=inventory" --format "{{.Names}}" 2>/dev/null)
    if [ -n "$RUNNING_CONTAINERS" ]; then
        echo -e "${GREEN}Running Docker Containers:${NC}"
        echo "$RUNNING_CONTAINERS" | while read container; do
            STATUS=$(docker inspect -f '{{.State.Status}}' "$container")
            if [ "$STATUS" == "running" ]; then
                echo -e "  ${GREEN}✓${NC} $container"
            else
                echo -e "  ${RED}✗${NC} $container (${RED}$STATUS${NC})"
            fi
        done
    else
        echo -e "${YELLOW}⚠${NC} No Docker containers running"
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker not available"
fi

# Check PM2 processes
if command -v pm2 &> /dev/null; then
    echo ""
    PM2_PROCESSES=$(pm2 jlist 2>/dev/null | grep -c "inventory-backend" || echo "0")
    if [ "$PM2_PROCESSES" -gt 0 ]; then
        echo -e "${GREEN}PM2 Processes:${NC}"
        pm2 list | grep inventory || true
    else
        echo -e "${YELLOW}⚠${NC} No PM2 processes running"
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ✅ NEXT STEPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -f "inventory-backend/.env.local" ] && grep -q "MONGODB_URI=mongodb+srv://" inventory-backend/.env.local; then
    echo -e "${GREEN}1.${NC} Configuration looks good!"
    echo -e "${GREEN}2.${NC} Run pre-deployment test: ${YELLOW}./test-deployment.sh${NC}"
    echo -e "${GREEN}3.${NC} Deploy application: ${YELLOW}./quick-deploy.sh deploy${NC}"
    echo -e "${GREEN}4.${NC} Check health: ${YELLOW}./health-check.sh${NC}"
else
    echo -e "${YELLOW}1.${NC} Configure MongoDB URI in ${YELLOW}inventory-backend/.env.local${NC}"
    echo -e "${YELLOW}2.${NC} Change JWT_SECRET for production"
    echo -e "${YELLOW}3.${NC} Run: ${YELLOW}./test-deployment.sh${NC}"
    echo -e "${YELLOW}4.${NC} Deploy: ${YELLOW}./quick-deploy.sh deploy${NC}"
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              ${GREEN}✓ Deployment System Ready!${CYAN}                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
