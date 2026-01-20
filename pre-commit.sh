#!/bin/bash

# Pre-commit hook to prevent committing sensitive files
# Install: cp pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
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

# Check for actual hardcoded credentials (not variable names or parameters)
# This looks for patterns like: PASSWORD="actualvalue" or API_KEY='actualkey123'
# But excludes: password_hash, const password, function(password), etc.
if git diff --cached | grep -E "^[+].*\b(PASSWORD|SECRET|API_KEY|PRIVATE_KEY|ACCESS_TOKEN)\s*=\s*['\"][a-zA-Z0-9_\-\+\/]{10,}['\"]"; then
    echo -e "${RED}✗ ERROR: Found hardcoded credentials in staged files!${NC}"
    echo -e "${YELLOW}  Detected environment variable assignments with actual values.${NC}"
    echo ""
    echo "Matches:"
    git diff --cached | grep -E "^[+].*\b(PASSWORD|SECRET|API_KEY|PRIVATE_KEY|ACCESS_TOKEN)\s*=\s*['\"][a-zA-Z0-9_\-\+\/]{10,}['\"]"
    echo ""
    echo "Use environment variables instead (.env file)"
    exit 1
fi

# Check for database connection strings with actual passwords in code
if git diff --cached | grep -E "postgresql://.*:.*@.*\.(supabase\.co|amazonaws\.com)" | grep -v "YOUR_PASSWORD\|your-password\|<password>"; then
    echo -e "${RED}✗ ERROR: Found database connection string with credentials!${NC}"
    echo -e "${YELLOW}  Use environment variables for database credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-commit checks passed${NC}"
exit 0
