#!/bin/bash

# Vercel Deployment Script
# Automated deployment for backend and frontend

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║          ${GREEN}🚀 Vercel Deployment - Inventory System${CYAN}            ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗${NC} Vercel CLI not found!"
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✓${NC} Vercel CLI is ready"
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Not logged in to Vercel"
    echo -e "${BLUE}Please login to Vercel:${NC}"
    vercel login
    echo ""
fi

VERCEL_USER=$(vercel whoami 2>/dev/null)
echo -e "${GREEN}✓${NC} Logged in as: ${CYAN}$VERCEL_USER${NC}"
echo ""

# Deployment options
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deployment Options${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}1)${NC} Deploy Backend (Production)"
echo -e "  ${CYAN}2)${NC} Deploy Frontend (Production)"
echo -e "  ${CYAN}3)${NC} Deploy Both (Backend → Frontend)"
echo -e "  ${CYAN}4)${NC} Deploy Backend (Preview)"
echo -e "  ${CYAN}5)${NC} Deploy Frontend (Preview)"
echo -e "  ${CYAN}6)${NC} Exit"
echo ""

read -p "Select option [1-6]: " option

case $option in
    1)
        echo ""
        echo -e "${BLUE}Deploying Backend to Production...${NC}"
        cd inventory-backend
        
        # Check environment file
        if [ ! -f ".env.local" ]; then
            echo -e "${YELLOW}⚠${NC} .env.local not found. Make sure to configure environment variables in Vercel Dashboard."
        fi
        
        echo ""
        echo -e "${YELLOW}Important:${NC} Make sure to configure these environment variables in Vercel:"
        echo "  - MONGODB_URI"
        echo "  - JWT_SECRET"
        echo "  - CORS_ORIGINS"
        echo ""
        
        read -p "Continue with deployment? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            vercel --prod
            echo ""
            echo -e "${GREEN}✓${NC} Backend deployed successfully!"
            echo -e "${CYAN}Don't forget to:${NC}"
            echo "  1. Configure environment variables in Vercel Dashboard"
            echo "  2. Update CORS_ORIGINS with frontend URL"
        fi
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}Deploying Frontend to Production...${NC}"
        cd inventory-frontend
        
        echo ""
        echo -e "${YELLOW}Important:${NC} Make sure to configure these environment variables in Vercel:"
        echo "  - VITE_API_BASE_URL (backend URL)"
        echo ""
        
        read -p "Continue with deployment? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            vercel --prod
            echo ""
            echo -e "${GREEN}✓${NC} Frontend deployed successfully!"
            echo -e "${CYAN}Don't forget to:${NC}"
            echo "  1. Update VITE_API_BASE_URL with backend URL in Vercel Dashboard"
            echo "  2. Redeploy if needed"
        fi
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}Deploying Backend first...${NC}"
        cd inventory-backend
        
        echo ""
        echo -e "${YELLOW}Backend Environment Variables Required:${NC}"
        echo "  - MONGODB_URI"
        echo "  - JWT_SECRET"
        echo "  - CORS_ORIGINS"
        echo ""
        
        read -p "Continue with backend deployment? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            BACKEND_URL=$(vercel --prod 2>&1 | grep -o 'https://[^[:space:]]*')
            echo ""
            echo -e "${GREEN}✓${NC} Backend deployed!"
            echo -e "${CYAN}Backend URL:${NC} $BACKEND_URL"
            
            echo ""
            echo -e "${BLUE}Now deploying Frontend...${NC}"
            cd ../inventory-frontend
            
            echo ""
            echo -e "${YELLOW}Configure frontend to use backend URL:${NC}"
            echo "  VITE_API_BASE_URL=$BACKEND_URL/api"
            echo ""
            
            read -p "Continue with frontend deployment? (y/n): " confirm2
            if [ "$confirm2" = "y" ]; then
                FRONTEND_URL=$(vercel --prod 2>&1 | grep -o 'https://[^[:space:]]*')
                echo ""
                echo -e "${GREEN}✓${NC} Frontend deployed!"
                echo -e "${CYAN}Frontend URL:${NC} $FRONTEND_URL"
                
                echo ""
                echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
                echo -e "${GREEN}║              ✓ Deployment Complete!                           ║${NC}"
                echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
                echo ""
                echo -e "${CYAN}Backend:${NC}  $BACKEND_URL"
                echo -e "${CYAN}Frontend:${NC} $FRONTEND_URL"
                echo ""
                echo -e "${YELLOW}Next Steps:${NC}"
                echo "  1. Go to Vercel Dashboard: https://vercel.com/dashboard"
                echo "  2. Configure backend environment variables"
                echo "  3. Update CORS_ORIGINS in backend with: $FRONTEND_URL"
                echo "  4. Update VITE_API_BASE_URL in frontend with: $BACKEND_URL/api"
                echo "  5. Redeploy both if needed"
                echo "  6. Test the application"
            fi
        fi
        ;;
        
    4)
        echo ""
        echo -e "${BLUE}Deploying Backend (Preview)...${NC}"
        cd inventory-backend
        vercel
        echo ""
        echo -e "${GREEN}✓${NC} Backend preview deployed!"
        ;;
        
    5)
        echo ""
        echo -e "${BLUE}Deploying Frontend (Preview)...${NC}"
        cd inventory-frontend
        vercel
        echo ""
        echo -e "${GREEN}✓${NC} Frontend preview deployed!"
        ;;
        
    6)
        echo -e "${BLUE}Exiting...${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid option!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Useful Commands${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}View deployments:${NC}      vercel ls"
echo -e "${YELLOW}View logs:${NC}             vercel logs [deployment-url]"
echo -e "${YELLOW}Remove project:${NC}        vercel remove [project-name]"
echo -e "${YELLOW}Vercel dashboard:${NC}      https://vercel.com/dashboard"
echo ""
