# Production Deployment Guide - Falkon.tech

## Overview

This guide covers deploying the ATS system to production on falkon.tech.

## Architecture

- **Frontend**: https://falkon.tech (or www.falkon.tech)
- **Backend API**: https://api.falkon.tech
- **Database**: Neon PostgreSQL (already configured)
- **Email**: Zoho SMTP (already configured)

## Pre-Deployment Checklist

### 1. Environment Configuration

#### Backend (.env)

```bash
NODE_ENV=production
PORT=5000
API_PUBLIC_URL=https://api.falkon.tech
CORS_ORIGIN=https://falkon.tech,https://www.falkon.tech

# Database (already configured)
DATABASE_URL=your-neon-connection-string

# Email (already configured)
EMAIL_SERVICE=zoho
EMAIL_USER=falkon@falkon.tech
EMAIL_PASSWORD=your-zoho-app-password
EMAIL_FROM=noreply@falkon.tech
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=465
EMAIL_SECURE=true

# Admin
ADMIN_EMAIL=falkon@falkon.tech
ADMIN_PASSWORD=ATSSystem2026
ADMIN_COMPANY=Falkon

# Auth
JWT_SECRET=your-production-secret-min-48-chars
JWT_EXPIRES_IN=7d
```

#### Frontend (.env)

```bash
VITE_API_BASE_URL=https://api.falkon.tech
```

### 2. Database Setup

```bash
cd backend
npm run migrate
npm run seed:admin
```

### 3. Build Frontend

```bash
cd frontend
npm install
npm run build
# Output will be in frontend/dist/
```

### 4. DNS Configuration

Set up the following DNS records:

- `falkon.tech` → Frontend hosting (Vercel/Netlify/CloudFlare Pages)
- `www.falkon.tech` → Redirect to falkon.tech or same as above
- `api.falkon.tech` → Backend server (Railway/Render/DigitalOcean)

### 5. SSL/TLS Certificates

Ensure HTTPS is enabled on both frontend and backend domains.

## Deployment Options

### Option A: Docker Compose (Single Server)

```bash
# Update docker-compose.yml environment variables
docker-compose up -d
```

### Option B: Separate Hosting

#### Frontend (Vercel/Netlify)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_BASE_URL=https://api.falkon.tech`

#### Backend (Railway/Render/DigitalOcean)

1. Deploy from GitHub
2. Set environment variables from backend/.env.example
3. Ensure PORT is exposed (default 5000)
4. Set domain to api.falkon.tech

## Post-Deployment

### 1. Verify Backend

```bash
curl https://api.falkon.tech/health
```

Expected response: `{"status":"ok","database":"connected"}`

### 2. Test Super Admin Login

- Navigate to https://falkon.tech/login
- Email: falkon@falkon.tech
- Password: ATSSystem2026

### 3. Test Email Approval Flow

1. Sign up a test account
2. Check falkon@falkon.tech for approval email
3. Click approval link or use Approvals page
4. Verify new account can log in

### 4. Verify Approvals Page

- Log in as super admin
- Navigate to "Approvals" in sidebar
- Should see pending accounts (if any)
- Test approve/reject functionality

## Security Considerations

1. **Change default admin password** after first login via Profile page
2. **Rotate JWT_SECRET** regularly
3. **Monitor CORS_ORIGIN** - never use '\*' in production
4. **Database backups** - configure Neon backups
5. **Rate limiting** - already enabled in backend
6. **HTTPS only** - ensure both domains enforce HTTPS

## Monitoring

- Backend logs: Check hosting platform logs
- Database: Neon dashboard for connection/query monitoring
- Email: Zoho logs for delivery status

## Troubleshooting

### Frontend can't reach backend

- Verify CORS_ORIGIN includes exact frontend URL
- Check API_PUBLIC_URL in backend .env
- Verify VITE_API_BASE_URL in frontend .env

### Email approval links broken

- Verify API_PUBLIC_URL matches actual backend domain
- Check EMAIL\_\* configuration in backend .env
- Test SMTP connection: `npm run seed:admin` (should work if email is configured)

### Super admin can't approve accounts

- Verify super admin has no `parentAccountId` (run `npm run seed:admin`)
- Check browser console for API errors
- Verify `/auth/pending-approvals` endpoint is accessible

## Maintenance

### Database Migrations

```bash
cd backend
npm run migrate
```

### Reset Super Admin

```bash
cd backend
npm run seed:admin
```

### Update Dependencies

```bash
# Backend
cd backend && npm update

# Frontend
cd frontend && npm update
```

## Support

For issues, check:

- Backend logs for API errors
- Browser console for frontend errors
- Neon dashboard for database issues
- Zoho logs for email delivery problems
