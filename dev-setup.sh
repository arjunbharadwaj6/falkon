#!/bin/bash

# ATS Development Environment Setup Script
# This script sets up the project for local development

set -e  # Exit on error

echo "🚀 Setting up ATS Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist, if not copy from examples
echo -e "${BLUE}1. Setting up environment files...${NC}"

if [ ! -f "backend/.env" ]; then
  echo "  • Creating backend/.env from .env.development"
  cp backend/.env.development backend/.env
  echo -e "    ${GREEN}✓ backend/.env created${NC}"
else
  echo "  • backend/.env already exists"
fi

if [ ! -f "frontend/.env" ]; then
  echo "  • Creating frontend/.env from .env.development"
  cp frontend/.env.development frontend/.env
  echo -e "    ${GREEN}✓ frontend/.env created${NC}"
else
  echo "  • frontend/.env already exists"
fi

echo ""
echo -e "${BLUE}2. Installing backend dependencies...${NC}"
cd backend
npm install > /dev/null 2>&1
echo -e "  ${GREEN}✓ Backend dependencies installed${NC}"

echo ""
echo -e "${BLUE}3. Installing frontend dependencies...${NC}"
cd ../frontend
npm install > /dev/null 2>&1
echo -e "  ${GREEN}✓ Frontend dependencies installed${NC}"

cd ..

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Update database configuration in backend/.env (if using local PostgreSQL)"
echo ""
echo "2. Run migrations (optional - for fresh database):"
echo "   cd backend && npm run migrate"
echo ""
echo "3. Start development servers in separate terminals:"
echo ""
echo "   Terminal 1 - Backend:"
echo "   cd backend && npm run dev"
echo ""
echo "   Terminal 2 - Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open http://localhost:5174 in your browser"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
