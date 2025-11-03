#!/bin/bash

# Health Check Script for Inventory Management System
# Use this for monitoring and alerting

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKEND_URL="http://localhost:3001/api/health"
FRONTEND_URL="http://localhost"
MONGODB_HOST="localhost"
MONGODB_PORT="27017"

check_backend() {
    echo -n "Backend API: "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" 2>/dev/null)
    if [[ "$response" == "200" ]]; then
        echo -e "${GREEN}✓ Healthy${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ Down${NC} (HTTP $response)"
        return 1
    fi
}

check_frontend() {
    echo -n "Frontend: "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null)
    if [[ "$response" == "200" ]]; then
        echo -e "${GREEN}✓ Healthy${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ Down${NC} (HTTP $response)"
        return 1
    fi
}

check_mongodb() {
    echo -n "MongoDB: "
    if nc -z "$MONGODB_HOST" "$MONGODB_PORT" 2>/dev/null; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

check_disk_space() {
    echo -n "Disk Space: "
    available=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [[ $available -gt 5 ]]; then
        echo -e "${GREEN}✓ ${available}GB available${NC}"
        return 0
    elif [[ $available -gt 2 ]]; then
        echo -e "${YELLOW}⚠ ${available}GB available${NC}"
        return 0
    else
        echo -e "${RED}✗ Only ${available}GB available${NC}"
        return 1
    fi
}

check_memory() {
    echo -n "Memory: "
    available=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [[ $available -gt 500 ]]; then
        echo -e "${GREEN}✓ ${available}MB available${NC}"
        return 0
    elif [[ $available -gt 200 ]]; then
        echo -e "${YELLOW}⚠ ${available}MB available${NC}"
        return 0
    else
        echo -e "${RED}✗ Only ${available}MB available${NC}"
        return 1
    fi
}

check_pm2() {
    if command -v pm2 &> /dev/null; then
        echo "PM2 Processes:"
        pm2 list | grep -i inventory || echo "  No inventory processes found"
    fi
}

check_docker() {
    if command -v docker &> /dev/null; then
        echo "Docker Containers:"
        docker ps | grep -i inventory || echo "  No inventory containers running"
    fi
}

# Main
echo "========================================="
echo "  System Health Check"
echo "  $(date)"
echo "========================================="
echo ""

all_healthy=true

check_backend || all_healthy=false
check_frontend || all_healthy=false
check_mongodb || all_healthy=false
check_disk_space || all_healthy=false
check_memory || all_healthy=false

echo ""
check_pm2
echo ""
check_docker

echo ""
echo "========================================="
if $all_healthy; then
    echo -e "${GREEN}✓ All systems operational${NC}"
    exit 0
else
    echo -e "${RED}✗ Some systems are down${NC}"
    exit 1
fi
