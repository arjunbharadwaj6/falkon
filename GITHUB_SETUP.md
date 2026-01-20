# GitHub Security Setup - Quick Guide

## ✅ What's Been Set Up

### 1. Environment Protection

- ✅ `.gitignore` configured to exclude `.env` files
- ✅ `.env.example` templates created (safe to commit)
- ✅ Hardcoded credentials removed from README
- ✅ `uploads/` directory configured with `.gitkeep`

### 2. Documentation

- ✅ `README.md` - Comprehensive project documentation
- ✅ `SECURITY.md` - Security policies and best practices
- ✅ Setup script (`setup.sh`) for easy onboarding

### 3. Automation

- ✅ GitHub Actions workflow (`.github/workflows/security.yml`)
- ✅ Pre-commit hook script (`pre-commit.sh`)

## 🚀 Before Pushing to GitHub

### Step 1: Initialize Git (if not already done)

```bash
cd /home/arjunbharadwaj/Documents/Builds/ATS
git init
```

### Step 2: Install Pre-commit Hook

```bash
cp pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Step 3: Verify .env is Ignored

```bash
# This should output: backend/.env and frontend/.env
git check-ignore backend/.env frontend/.env

# If not working, ensure .gitignore includes .env
```

### Step 4: Stage Your Files

```bash
# Stage everything except .env files
git add .

# Verify .env files are NOT staged
git status
# Should NOT show backend/.env or frontend/.env
```

### Step 5: Commit

```bash
git commit -m "Initial commit: ATS application"
```

### Step 6: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (don't initialize with README)
3. Copy the repository URL

### Step 7: Push to GitHub

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## ⚠️ Critical Security Reminders

### NEVER Commit These Files:

- ❌ `backend/.env`
- ❌ `frontend/.env`
- ❌ `node_modules/`
- ❌ `uploads/*` (except .gitkeep)
- ❌ Any file with actual passwords or API keys

### ALWAYS Commit These Files:

- ✅ `backend/.env.example`
- ✅ `frontend/.env.example`
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ `SECURITY.md`
- ✅ All source code files

## 🔍 Verify Before Pushing

Run these commands to double-check:

```bash
# 1. Check what will be committed
git status

# 2. Verify .env is ignored
git check-ignore backend/.env frontend/.env

# 3. Search for hardcoded secrets
grep -r "ATSDataBase\|YWyKrtum6yc7\|falkon@falkon" --exclude-dir=.git --exclude="*.env" .

# 4. Check for .env in git
git ls-files | grep "\.env$"
# Should only show .env.example files
```

## 🛡️ After Pushing to GitHub

### Set Up Repository Secrets (for CI/CD)

If you plan to deploy via GitHub Actions:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add these secrets:
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - `EMAIL_PASSWORD`
   - etc.

### Enable Security Features

1. Go to Settings → Security
2. Enable:
   - Dependabot alerts
   - Dependabot security updates
   - Code scanning

### Branch Protection

1. Go to Settings → Branches
2. Add rule for `main`:
   - Require pull request reviews
   - Require status checks (security audit)
   - Require branches to be up to date

## 📋 Team Onboarding

When team members clone the repository:

```bash
git clone <repo-url>
cd ATS
./setup.sh

# Then manually edit .env files with credentials
```

## 🔐 Credential Management

### For Development:

- Each developer maintains their own `.env` files locally
- Share credentials via secure channels (1Password, LastPass, etc.)
- Never via email, Slack, or other insecure methods

### For Production:

- Use environment variables on hosting platform
- Use secrets management services (AWS Secrets Manager, etc.)
- Rotate credentials regularly

## 🚨 If You Accidentally Commit Secrets

### 1. Remove from Latest Commit

```bash
git reset HEAD~1
# Edit files to remove secrets
git add .
git commit -m "Your message"
```

### 2. Already Pushed?

**⚠️ CRITICAL: Secrets in git history are permanently exposed!**

You must:

1. **Immediately rotate all exposed credentials**
2. Remove from git history:
   ```bash
   # Use git-filter-repo or BFG Repo Cleaner
   git filter-repo --path backend/.env --invert-paths
   git push --force
   ```
3. Consider the credentials compromised - change them everywhere

## ✅ Final Checklist

Before pushing to GitHub, verify:

- [ ] `.gitignore` includes `.env`
- [ ] `.env` files are not staged
- [ ] `.env.example` files exist with placeholders
- [ ] No hardcoded secrets in code
- [ ] README.md has no actual credentials
- [ ] Pre-commit hook installed
- [ ] Ran security verification commands
- [ ] Documentation is complete

## 📚 Additional Resources

- [SECURITY.md](SECURITY.md) - Full security documentation
- [README.md](README.md) - Project setup guide
- GitHub Docs: [Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

**Remember: Once secrets are in git history, they're compromised forever. Prevention is key!**
