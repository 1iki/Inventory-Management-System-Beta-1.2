#!/bin/bash

# Pre-deployment Test Script
# Run this before actual deployment to catch issues early

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Pre-Deployment Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

test_passed=0
test_failed=0

run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing $test_name... "
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((test_passed++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((test_failed++))
        return 1
    fi
}

# System checks
echo -e "${BLUE}System Checks:${NC}"
run_test "Node.js installed" "command -v node"
run_test "npm installed" "command -v npm"
run_test "Docker installed" "command -v docker"
run_test "Docker Compose available" "docker compose version"
echo ""

# File checks
echo -e "${BLUE}Configuration Files:${NC}"
run_test ".env exists" "test -f .env"
run_test "Backend .env.local exists" "test -f inventory-backend/.env.local"
run_test "Frontend .env.local exists" "test -f inventory-frontend/.env.local"
run_test "docker-compose.yml valid" "docker-compose config"
echo ""

# Backend tests
echo -e "${BLUE}Backend Tests:${NC}"
if [ -d "inventory-backend" ]; then
    cd inventory-backend
    run_test "Backend package.json valid" "test -f package.json"
    run_test "Backend Dockerfile exists" "test -f Dockerfile"
    
    if [ -f ".env.local" ]; then
        # Check for critical env vars
        if grep -q "MONGODB_URI=mongodb" .env.local && \
           ! grep -q "MONGODB_URI=mongodb+srv://<username>" .env.local; then
            echo -e "MongoDB URI: ${GREEN}✓ CONFIGURED${NC}"
            ((test_passed++))
        else
            echo -e "MongoDB URI: ${RED}✗ NOT CONFIGURED${NC}"
            ((test_failed++))
        fi
        
        if grep -q "JWT_SECRET=" .env.local && \
           ! grep -q "JWT_SECRET=inventory-system-jwt-secret" .env.local && \
           ! grep -q "JWT_SECRET=CHANGE" .env.local; then
            echo -e "JWT Secret: ${GREEN}✓ CHANGED${NC}"
            ((test_passed++))
        else
            echo -e "JWT Secret: ${YELLOW}⚠ USING DEFAULT${NC}"
            echo -e "  ${YELLOW}Warning: Change JWT_SECRET before production deployment!${NC}"
        fi
    fi
    cd ..
fi
echo ""

# Frontend tests
echo -e "${BLUE}Frontend Tests:${NC}"
if [ -d "inventory-frontend" ]; then
    cd inventory-frontend
    run_test "Frontend package.json valid" "test -f package.json"
    run_test "Frontend Dockerfile exists" "test -f Dockerfile"
    run_test "Nginx config exists" "test -f nginx.conf"
    
    if [ -f ".env.local" ]; then
        if grep -q "VITE_API_BASE_URL=http" .env.local; then
            echo -e "API URL: ${GREEN}✓ CONFIGURED${NC}"
            ((test_passed++))
        else
            echo -e "API URL: ${RED}✗ NOT CONFIGURED${NC}"
            ((test_failed++))
        fi
    fi
    cd ..
fi
echo ""

# Network tests
echo -e "${BLUE}Network Tests:${NC}"
run_test "Port 3001 available" "! lsof -Pi :3001 -sTCP:LISTEN -t"
run_test "Port 80 available" "! lsof -Pi :80 -sTCP:LISTEN -t"
run_test "Internet connectivity" "ping -c 1 google.com"
echo ""

# Disk space check
echo -e "${BLUE}Resource Checks:${NC}"
available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$available_space" -gt 5 ]; then
    echo -e "Disk Space: ${GREEN}✓ ${available_space}GB available${NC}"
    ((test_passed++))
elif [ "$available_space" -gt 2 ]; then
    echo -e "Disk Space: ${YELLOW}⚠ ${available_space}GB available${NC}"
    echo -e "  ${YELLOW}Warning: Low disk space. Recommended: 5GB+${NC}"
else
    echo -e "Disk Space: ${RED}✗ Only ${available_space}GB available${NC}"
    ((test_failed++))
fi

available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$available_mem" -gt 500 ]; then
    echo -e "Memory: ${GREEN}✓ ${available_mem}MB available${NC}"
    ((test_passed++))
elif [ "$available_mem" -gt 200 ]; then
    echo -e "Memory: ${YELLOW}⚠ ${available_mem}MB available${NC}"
    echo -e "  ${YELLOW}Warning: Low memory. Recommended: 1GB+${NC}"
else
    echo -e "Memory: ${RED}✗ Only ${available_mem}MB available${NC}"
    ((test_failed++))
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Tests Passed: ${GREEN}$test_passed${NC}"
echo -e "Tests Failed: ${RED}$test_failed${NC}"
echo ""

if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review configuration files"
    echo "  2. Run: ./quick-deploy.sh deploy"
    echo "  or"
    echo "  3. Run: make deploy"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues before deployment.${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Missing .env files: Run 'make setup-env'"
    echo "  - MongoDB not configured: Edit inventory-backend/.env.local"
    echo "  - Ports in use: Stop other services or change ports"
    echo "  - Low resources: Free up disk space or memory"
    exit 1
fi
