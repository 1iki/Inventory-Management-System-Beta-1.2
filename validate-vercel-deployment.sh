#!/bin/bash

# Vercel Deployment Validation Script
# This script validates that frontend and backend are properly configured

# Don't exit on errors - we want to collect all validation results
set +e

echo "🔍 Validating Vercel Deployment Configuration..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" == "ERROR" ]; then
        echo -e "${RED}❌ ERROR: ${message}${NC}"
        ((ERRORS++))
    elif [ "$status" == "WARNING" ]; then
        echo -e "${YELLOW}⚠️  WARNING: ${message}${NC}"
        ((WARNINGS++))
    elif [ "$status" == "SUCCESS" ]; then
        echo -e "${GREEN}✅ SUCCESS: ${message}${NC}"
        ((SUCCESS++))
    else
        echo "$message"
    fi
}

# Check if we're in the right directory
if [ ! -d "inventory-backend" ] || [ ! -d "inventory-frontend" ]; then
    print_status "ERROR" "Must be run from repository root directory"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 CHECKING BACKEND CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check backend vercel.json
if [ -f "inventory-backend/vercel.json" ]; then
    print_status "SUCCESS" "Backend vercel.json exists"
    
    # Check if it has correct framework setting
    if grep -q '"framework": "nextjs"' "inventory-backend/vercel.json"; then
        print_status "SUCCESS" "Backend configured for Next.js framework"
    else
        print_status "WARNING" "Backend vercel.json may need framework: nextjs configuration"
    fi
else
    print_status "ERROR" "Backend vercel.json not found"
fi

# Check backend package.json
if [ -f "inventory-backend/package.json" ]; then
    print_status "SUCCESS" "Backend package.json exists"
    
    # Check for required scripts
    if grep -q '"build":' "inventory-backend/package.json"; then
        print_status "SUCCESS" "Backend has build script"
    else
        print_status "ERROR" "Backend missing build script in package.json"
    fi
    
    if grep -q '"start":' "inventory-backend/package.json"; then
        print_status "SUCCESS" "Backend has start script"
    else
        print_status "ERROR" "Backend missing start script in package.json"
    fi
else
    print_status "ERROR" "Backend package.json not found"
fi

# Check middleware
if [ -f "inventory-backend/middleware.ts" ]; then
    print_status "SUCCESS" "Backend middleware.ts exists"
    
    # Check CORS configuration
    if grep -q "CORS_ORIGINS" "inventory-backend/middleware.ts"; then
        print_status "SUCCESS" "Backend has CORS_ORIGINS configuration"
    else
        print_status "WARNING" "Backend CORS configuration may need review"
    fi
else
    print_status "WARNING" "Backend middleware.ts not found"
fi

# Check next.config
if [ -f "inventory-backend/next.config.ts" ] || [ -f "inventory-backend/next.config.js" ]; then
    print_status "SUCCESS" "Backend next.config exists"
else
    print_status "WARNING" "Backend next.config not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 CHECKING FRONTEND CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check frontend vercel.json
if [ -f "inventory-frontend/vercel.json" ]; then
    print_status "SUCCESS" "Frontend vercel.json exists"
    
    # Check if it has correct framework setting
    if grep -q '"framework": "vite"' "inventory-frontend/vercel.json"; then
        print_status "SUCCESS" "Frontend configured for Vite framework"
    else
        print_status "WARNING" "Frontend vercel.json should have framework: vite"
    fi
    
    # Check for rewrites
    if grep -q '"rewrites"' "inventory-frontend/vercel.json"; then
        print_status "SUCCESS" "Frontend has URL rewrites configured"
    else
        print_status "WARNING" "Frontend may need rewrites for SPA routing"
    fi
else
    print_status "ERROR" "Frontend vercel.json not found"
fi

# Check frontend package.json
if [ -f "inventory-frontend/package.json" ]; then
    print_status "SUCCESS" "Frontend package.json exists"
    
    # Check for required scripts
    if grep -q '"build":' "inventory-frontend/package.json"; then
        print_status "SUCCESS" "Frontend has build script"
    else
        print_status "ERROR" "Frontend missing build script in package.json"
    fi
else
    print_status "ERROR" "Frontend package.json not found"
fi

# Check .env.production
if [ -f "inventory-frontend/.env.production" ]; then
    print_status "SUCCESS" "Frontend .env.production exists"
    
    # Check if it has hardcoded URLs (should not)
    if grep -q "VITE_API_BASE_URL=https://" "inventory-frontend/.env.production"; then
        print_status "WARNING" "Frontend .env.production contains hardcoded URL - should be set in Vercel Dashboard instead"
    else
        print_status "SUCCESS" "Frontend .env.production uses proper configuration"
    fi
else
    print_status "WARNING" "Frontend .env.production not found"
fi

# Check API configuration
if [ -f "inventory-frontend/src/lib/api.ts" ]; then
    print_status "SUCCESS" "Frontend API configuration file exists"
    
    # Check for proper environment variable usage
    if grep -q "VITE_API_BASE_URL" "inventory-frontend/src/lib/api.ts"; then
        print_status "SUCCESS" "Frontend uses VITE_API_BASE_URL environment variable"
    else
        print_status "ERROR" "Frontend API config doesn't use VITE_API_BASE_URL"
    fi
else
    print_status "ERROR" "Frontend API configuration file not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VALIDATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Total Checks: $((SUCCESS + WARNINGS + ERRORS))"
echo -e "${GREEN}✅ Successful: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"

echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "✅ Configuration is ready for Vercel deployment"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables in Vercel Dashboard"
    echo "2. Deploy backend: cd inventory-backend && vercel --prod"
    echo "3. Deploy frontend: cd inventory-frontend && vercel --prod"
    echo ""
    echo "See VERCEL_CONNECTION_FIX.md for detailed instructions"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  VALIDATION COMPLETED WITH WARNINGS${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Configuration has warnings but should work."
    echo "Please review warnings above and fix if needed."
    echo ""
    echo "See VERCEL_CONNECTION_FIX.md for detailed instructions"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Please fix the errors above before deploying to Vercel."
    echo ""
    echo "See VERCEL_CONNECTION_FIX.md for detailed instructions"
    exit 1
fi
