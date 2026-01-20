#!/bin/bash

# Pre-commit hook to prevent committing sensitive files
# Install: cp pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔒 Running pre-commit security checks..."

# Check for .env files
if git diff --cached --name-only | grep -E "\.env$" | grep -v "\.env\.example"; then
    echo -e "${RED}✗ ERROR: Attempting to commit .env file!${NC}"
    echo -e "${YELLOW}  .env files contain sensitive credentials and should never be committed.${NC}"
    echo -e "${YELLOW}  Use .env.example for templates instead.${NC}"
    echo ""
    echo "Files being committed:"
    git diff --cached --name-only | grep -E "\.env$"
    echo ""
    echo "To fix:"
    echo "  1. Remove .env from staging: git reset HEAD backend/.env frontend/.env"
    echo "  2. Ensure .gitignore includes .env"
    exit 1
fi

# Check for potential secrets in staged files
if git diff --cached | grep -iE "(password|secret|api_key|token).*=.*['\"][^'\"]{8,}"; then
    echo -e "${YELLOW}⚠️  WARNING: Potential secrets detected in staged files${NC}"
    echo -e "${YELLOW}  Please review your changes to ensure no secrets are hardcoded.${NC}"
    echo ""
    read -p "Continue with commit? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for database credentials
if git diff --cached | grep -iE "(ATSDataBase|YWyKrtum6yc7|falkon@falkon\.tech)"; then
    echo -e "${RED}✗ ERROR: Found hardcoded credentials in staged files!${NC}"
    echo -e "${YELLOW}  Remove actual credentials before committing.${NC}"
    exit 1
fi

echo "✓ Pre-commit checks passed"
exit 0
