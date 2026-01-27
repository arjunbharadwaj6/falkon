#!/bin/bash

# Environment Switcher Script
# Usage: ./switch-env.sh dev|prod

ENV=${1:-dev}

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "❌ Invalid environment. Usage: ./switch-env.sh dev|prod"
  exit 1
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$ENV" = "dev" ]; then
  echo -e "${BLUE}Switching to Development Environment...${NC}"
  
  if [ ! -f "backend/.env.development" ]; then
    echo "❌ backend/.env.development not found. Run dev-setup.sh first."
    exit 1
  fi
  
  if [ ! -f "frontend/.env.development" ]; then
    echo "❌ frontend/.env.development not found. Run dev-setup.sh first."
    exit 1
  fi
  
  cp backend/.env.development backend/.env
  cp frontend/.env.development frontend/.env
  
  echo -e "${GREEN}✓ Switched to Development (localhost)${NC}"
  echo ""
  echo "Backend API: http://localhost:5000"
  echo "Frontend: http://localhost:5174"
  
else
  echo -e "${BLUE}Switching to Production Environment...${NC}"
  
  if [ ! -f "backend/.env.example" ]; then
    echo "❌ backend/.env.example not found"
    exit 1
  fi
  
  if [ ! -f "frontend/.env.example" ]; then
    echo "❌ frontend/.env.example not found"
    exit 1
  fi
  
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
  
  echo -e "${GREEN}✓ Switched to Production${NC}"
  echo ""
  echo "⚠️  IMPORTANT: Update these files with your production secrets:"
  echo "   • backend/.env"
  echo "   • frontend/.env"
  echo ""
  echo "Production URLs:"
  echo "   Backend API: https://api.falkon.tech"
  echo "   Frontend: https://falkon.tech"
fi

echo ""
