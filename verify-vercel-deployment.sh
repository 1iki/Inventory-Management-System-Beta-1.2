#!/bin/bash

# 🔍 Vercel Deployment Verification Script
# This script tests all critical endpoints and configurations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://inventory-backend-ev6m50tkl-1ikis-projects.vercel.app"
FRONTEND_URL="https://inventory-frontend-rouge.vercel.app"
FRONTEND_ORIGIN="https://inventory-frontend-rouge.vercel.app"

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}🔍 Vercel Deployment Verification${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Test 1: Backend Health Check
echo -e "${YELLOW}Test 1: Backend Health Check${NC}"
echo -e "URL: ${BACKEND_URL}/api/health"
echo ""

HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/api/health")
echo "Response:"
echo "$HEALTH_RESPONSE" | python3 -m json.tool || echo "$HEALTH_RESPONSE"
echo ""

DB_STATUS=$(echo "$HEALTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('database', {}).get('status', 'unknown'))" 2>/dev/null || echo "unknown")

if [ "$DB_STATUS" = "connected" ]; then
    echo -e "${GREEN}✅ Database is connected${NC}"
else
    echo -e "${RED}❌ Database is NOT connected (status: $DB_STATUS)${NC}"
    echo -e "${YELLOW}⚠️  Action: Set MONGODB_URI in Vercel Dashboard${NC}"
fi
echo ""

# Test 2: CORS Preflight Check
echo -e "${YELLOW}Test 2: CORS Preflight (OPTIONS) Check${NC}"
echo -e "URL: ${BACKEND_URL}/api/auth/login"
echo -e "Origin: ${FRONTEND_ORIGIN}"
echo ""

PREFLIGHT_RESPONSE=$(curl -s -i -X OPTIONS \
  "${BACKEND_URL}/api/auth/login" \
  -H "Origin: ${FRONTEND_ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type")

HTTP_STATUS=$(echo "$PREFLIGHT_RESPONSE" | grep -i "^HTTP" | tail -n1 | awk '{print $2}')
CORS_ORIGIN=$(echo "$PREFLIGHT_RESPONSE" | grep -i "access-control-allow-origin:" | cut -d' ' -f2- | tr -d '\r\n')
CORS_METHODS=$(echo "$PREFLIGHT_RESPONSE" | grep -i "access-control-allow-methods:" | cut -d' ' -f2- | tr -d '\r\n')

echo "HTTP Status: $HTTP_STATUS"
echo "Access-Control-Allow-Origin: $CORS_ORIGIN"
echo "Access-Control-Allow-Methods: $CORS_METHODS"
echo ""

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "204" ]; then
    echo -e "${GREEN}✅ Preflight returns 200/204 (correct)${NC}"
else
    echo -e "${RED}❌ Preflight returns $HTTP_STATUS (should be 200/204)${NC}"
    if [ "$HTTP_STATUS" = "308" ] || [ "$HTTP_STATUS" = "307" ]; then
        echo -e "${YELLOW}⚠️  Redirect detected! This will break CORS.${NC}"
    fi
fi

if [ -n "$CORS_ORIGIN" ] && [ "$CORS_ORIGIN" != "null" ]; then
    # Check for multiple values (comma or space separated)
    if [[ "$CORS_ORIGIN" == *","* ]] || [[ "$CORS_ORIGIN" == *" "* ]]; then
        echo -e "${RED}❌ CORS header contains multiple values${NC}"
        echo -e "${YELLOW}⚠️  Action: Fix CORS middleware to return single origin${NC}"
    else
        echo -e "${GREEN}✅ CORS origin is single value${NC}"
    fi
else
    echo -e "${RED}❌ No CORS origin header${NC}"
    echo -e "${YELLOW}⚠️  Action: Set CORS_ORIGINS in Vercel Dashboard${NC}"
fi

if [[ "$CORS_METHODS" == *"POST"* ]]; then
    echo -e "${GREEN}✅ POST method is allowed${NC}"
else
    echo -e "${RED}❌ POST method NOT in allowed methods${NC}"
fi
echo ""

# Test 3: Login API Test
echo -e "${YELLOW}Test 3: Login API Test${NC}"
echo -e "URL: ${BACKEND_URL}/api/auth/login"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST \
  "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_ORIGIN}" \
  -d '{"username":"admin_sari","password":"password123"}')

echo "Response:"
echo "$LOGIN_RESPONSE" | python3 -m json.tool || echo "$LOGIN_RESPONSE"
echo ""

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")

if [ "$LOGIN_SUCCESS" = "True" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
else
    echo -e "${RED}❌ Login failed${NC}"
fi
echo ""

# Test 4: Check for Double Slash/Path Issues
echo -e "${YELLOW}Test 4: URL Path Validation${NC}"
echo ""

# Test if wrong path returns error
WRONG_PATH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}//api/api/auth/login")
echo "Testing wrong path: ${BACKEND_URL}//api/api/auth/login"
echo "HTTP Status: $WRONG_PATH_RESPONSE"

if [ "$WRONG_PATH_RESPONSE" = "404" ]; then
    echo -e "${GREEN}✅ Wrong path correctly returns 404${NC}"
elif [ "$WRONG_PATH_RESPONSE" = "308" ] || [ "$WRONG_PATH_RESPONSE" = "307" ]; then
    echo -e "${YELLOW}⚠️  Wrong path triggers redirect (308/307)${NC}"
    echo -e "${YELLOW}⚠️  This will break CORS preflight!${NC}"
else
    echo -e "${YELLOW}⚠️  Wrong path returns $WRONG_PATH_RESPONSE${NC}"
fi
echo ""

# Test 5: Frontend Configuration Check
echo -e "${YELLOW}Test 5: Frontend Configuration${NC}"
echo -e "URL: ${FRONTEND_URL}"
echo ""

echo "Fetching frontend page..."
FRONTEND_HTML=$(curl -s "${FRONTEND_URL}")

# Try to find API configuration in the JavaScript
if echo "$FRONTEND_HTML" | grep -q "inventory-backend"; then
    echo -e "${GREEN}✅ Frontend HTML contains backend reference${NC}"
    
    # Extract backend URL from HTML (this is a rough check)
    BACKEND_IN_HTML=$(echo "$FRONTEND_HTML" | grep -o 'inventory-backend-[a-z0-9]*' | head -n1)
    echo "Backend deployment ID found in HTML: $BACKEND_IN_HTML"
    
    if [ "$BACKEND_IN_HTML" = "inventory-backend-ev6m50tkl" ]; then
        echo -e "${GREEN}✅ Frontend is using latest backend (ev6m50tkl)${NC}"
    elif [ "$BACKEND_IN_HTML" = "inventory-backend-eosin-kappa" ]; then
        echo -e "${RED}❌ Frontend is using OLD backend (eosin-kappa)${NC}"
        echo -e "${YELLOW}⚠️  Action: Update VITE_API_BASE_URL and redeploy frontend${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend is using: $BACKEND_IN_HTML${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not find backend reference in frontend HTML${NC}"
fi
echo ""

# Test 6: Deployment ID Check
echo -e "${YELLOW}Test 6: Deployment ID Verification${NC}"
echo ""

BACKEND_DEPLOYMENT=$(curl -s -I "${BACKEND_URL}" | grep -i "x-vercel-id:" | cut -d' ' -f2- | tr -d '\r\n')
FRONTEND_DEPLOYMENT=$(curl -s -I "${FRONTEND_URL}" | grep -i "x-vercel-id:" | cut -d' ' -f2- | tr -d '\r\n')

echo "Backend deployment ID: $BACKEND_DEPLOYMENT"
echo "Frontend deployment ID: $FRONTEND_DEPLOYMENT"
echo ""

if [ -n "$BACKEND_DEPLOYMENT" ]; then
    echo -e "${GREEN}✅ Backend deployment ID found${NC}"
else
    echo -e "${YELLOW}⚠️  Backend deployment ID not found in headers${NC}"
fi

if [ -n "$FRONTEND_DEPLOYMENT" ]; then
    echo -e "${GREEN}✅ Frontend deployment ID found${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend deployment ID not found in headers${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}📊 Verification Summary${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

ISSUES_FOUND=0

if [ "$DB_STATUS" != "connected" ]; then
    echo -e "${RED}❌ Database not connected${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "204" ]; then
    echo -e "${RED}❌ CORS preflight failing${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$LOGIN_SUCCESS" != "True" ]; then
    echo -e "${RED}❌ Login API not working${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ "$BACKEND_IN_HTML" = "inventory-backend-eosin-kappa" ]; then
    echo -e "${RED}❌ Frontend using outdated backend${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅✅✅ All checks passed! Deployment is healthy. ✅✅✅${NC}"
else
    echo -e "${RED}⚠️  Found $ISSUES_FOUND issue(s). See details above. ⚠️${NC}"
    echo ""
    echo -e "${YELLOW}Recommended actions:${NC}"
    echo "1. Set all environment variables in Vercel Dashboard"
    echo "2. Redeploy backend: cd inventory-backend && vercel --prod"
    echo "3. Redeploy frontend: cd inventory-frontend && vercel --prod"
    echo "4. Run this script again to verify fixes"
fi
echo ""

exit $ISSUES_FOUND
