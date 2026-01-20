#!/bin/bash

# ATS Project Setup Script
# This script helps you set up the ATS project securely

set -e

echo "🚀 ATS Project Setup"
echo "===================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d .git ]; then
    echo -e "${YELLOW}⚠️  Git repository not initialized${NC}"
    read -p "Initialize git repository? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        echo -e "${GREEN}✓ Git repository initialized${NC}"
    fi
fi

# Backend setup
echo ""
echo "📦 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created backend/.env from .env.example${NC}"
        echo -e "${YELLOW}⚠️  Please edit backend/.env with your actual credentials${NC}"
    else
        echo -e "${RED}✗ .env.example not found in backend${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

if [ ! -d node_modules ]; then
    echo "📥 Installing backend dependencies..."
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Create uploads directory if it doesn't exist
if [ ! -d uploads ]; then
    mkdir -p uploads
    echo -e "${GREEN}✓ Created uploads directory${NC}"
fi

cd ..

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created frontend/.env from .env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env.example found, using defaults${NC}"
        echo "VITE_API_BASE_URL=http://localhost:5000" > .env
        echo -e "${GREEN}✓ Created frontend/.env with defaults${NC}"
    fi
else
    echo -e "${GREEN}✓ frontend/.env already exists${NC}"
fi

if [ ! -d node_modules ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

cd ..

# Security checks
echo ""
echo "🔒 Security Checks"
echo "=================="

# Check if .env is in .gitignore
if git check-ignore backend/.env frontend/.env > /dev/null 2>&1; then
    echo -e "${GREEN}✓ .env files are properly ignored by git${NC}"
else
    echo -e "${RED}✗ WARNING: .env files might not be ignored by git!${NC}"
    echo -e "${YELLOW}  Make sure .gitignore includes .env${NC}"
fi

# Check if .env files have placeholder values
echo ""
echo "⚠️  Configuration Required"
echo "========================="
echo ""
echo "Before running the application, you need to configure:"
echo ""
echo "1. Backend (.env):"
echo "   - Database credentials (PostgreSQL/Supabase)"
echo "   - JWT_SECRET (generate a strong random string)"
echo "   - Email service credentials (Gmail or SMTP)"
echo ""
echo "2. Frontend (.env):"
echo "   - VITE_API_BASE_URL (default: http://localhost:5000)"
echo ""
echo "See SECURITY.md for detailed security guidelines."
echo ""

# Generate JWT secret suggestion
echo "💡 Tip: Generate a secure JWT secret with:"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""

# Next steps
echo "📝 Next Steps"
echo "============="
echo ""
echo "1. Edit backend/.env with your credentials"
echo "2. Run database migrations:"
echo "   cd backend && npm run migrate"
echo ""
echo "3. Start the backend:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start the frontend (in a new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Open http://localhost:5173 in your browser"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "⚠️  Remember: NEVER commit your .env files to git!"
