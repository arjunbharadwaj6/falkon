# Development Guide - ATS (Applicant Tracking System)

This guide helps you set up the ATS project for local development and deploy to production.

## Quick Start (5 minutes)

### 1. Initial Setup

```bash
# Run the development setup script (one time)
./dev-setup.sh
```

This script will:
- Create `.env` files from development templates
- Install all dependencies (backend & frontend)
- Display next steps

### 2. Start Development Servers

Open **two separate terminals** in the project root:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Access the Application

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

---

## Environment Management

### Development Environment (localhost)

Used for local development with relaxed security settings.

```bash
./switch-env.sh dev
```

**Configuration:**
- Backend API: `http://localhost:5000`
- Frontend: `http://localhost:5174`
- Database: Local PostgreSQL (ats_dev)
- CORS: Allows localhost
- JWT Secret: Dev placeholder

### Production Environment (falkon.tech)

Used for production deployment.

```bash
./switch-env.sh prod
```

**Configuration:**
- Backend API: `https://api.falkon.tech`
- Frontend: `https://falkon.tech`
- Database: Neon PostgreSQL
- CORS: Restricted to production domains
- JWT Secret: Must be set to strong random value

---

## Development Workflow

### 1. Make Changes

Edit files in `frontend/src/` or `backend/src/`

The dev servers will automatically reload:
- **Frontend:** Vite hot reload (instant)
- **Backend:** Nodemon watches files

### 2. Test Locally

Visit http://localhost:5174 and test your changes

### 3. Commit & Push to GitHub

```bash
git add .
git commit -m "feat: description of changes"
git push origin main
```

### 4. Deploy to Production

Switch to production environment and deploy:

```bash
./switch-env.sh prod
# Update backend/.env and frontend/.env with production secrets

# Deploy using Docker Compose or your hosting platform
docker compose up --build -d
```

---

## Common Development Tasks

### Database Operations

**Run migrations:**
```bash
cd backend
npm run migrate
```

**Seed super admin:**
```bash
cd backend
npm run seed:admin
```

**Reset database:**
```bash
cd backend
npm run reset-db
```

### Testing the API

Using curl or Postman:

```bash
# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","password":"AdminPassword123"}'

# Health check
curl http://localhost:5000/health
```

### View Database

```bash
psql -U postgres -d ats_dev
```

---

## Backend Development

### Available Scripts

```bash
cd backend

# Start development server with auto-reload
npm run dev

# Run migrations
npm run migrate

# Seed super admin
npm run seed:admin

# Reset database
npm run reset-db

# Start production server
npm start
```

### Project Structure

```
backend/
├── src/
│   ├── db.js                    # Database connection & queries
│   ├── server.js                # Express server setup
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── candidates.js        # Candidate management
│   │   ├── jobs.js              # Job posting
│   │   ├── dashboard.js         # Dashboard stats
│   │   └── ...
│   └── services/
│       └── email.js             # Email sending
├── scripts/
│   ├── run-migration.js         # Migration runner
│   ├── seed-super-admin.js      # Seed admin user
│   └── reset-db.js              # Reset database
└── sql/
    └── *.sql                    # Database migrations
```

### Adding a New Route

1. Create file in `backend/src/routes/`
2. Import in `backend/src/server.js`
3. Add route: `app.use('/api/path', router)`

### Debugging

Enable detailed logging:

```bash
cd backend
DEBUG=* npm run dev
```

---

## Frontend Development

### Available Scripts

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Project Structure

```
frontend/
├── src/
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # Entry point
│   ├── auth/
│   │   ├── AuthProvider.tsx     # Auth context
│   │   └── ProtectedRoute.tsx   # Route protection
│   ├── components/
│   │   └── Sidebar.tsx          # Navigation
│   ├── pages/
│   │   ├── Dashboard.tsx        # Dashboard page
│   │   ├── Login.tsx            # Login page
│   │   └── ...
│   ├── App.css                  # Global styles
│   └── index.css                # Tailwind styles
├── index.html                   # HTML template
└── vite.config.ts               # Vite configuration
```

### Adding a New Page

1. Create file in `frontend/src/pages/YourPage.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Sidebar.tsx`

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process using port
kill -9 <PID>
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check DATABASE_URL in backend/.env
cat backend/.env | grep DATABASE_URL
```

### Frontend Blank Page

1. Check browser console for errors (F12)
2. Verify `VITE_API_BASE_URL` in `frontend/.env`
3. Ensure backend is running on port 5000
4. Clear browser cache and restart dev server

### CORS Errors

If you see CORS errors:
1. Check `CORS_ORIGIN` in `backend/.env`
2. For development, it should include: `http://localhost:5174`
3. Restart backend server after changes

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Update `backend/.env` with production values:
  - `API_PUBLIC_URL=https://api.falkon.tech`
  - `DATABASE_URL=` (production database)
  - `JWT_SECRET=` (strong random 48+ char secret)
  - `EMAIL_*=` (production email credentials)
  - `CORS_ORIGIN=https://falkon.tech,https://www.falkon.tech`

- [ ] Update `frontend/.env`:
  - `VITE_API_BASE_URL=https://api.falkon.tech`

- [ ] Run migrations on production database:
  ```bash
  npm run migrate
  ```

- [ ] Seed production super admin:
  ```bash
  npm run seed:admin
  ```

- [ ] Test production build locally:
  ```bash
  npm run build && npm run preview
  ```

- [ ] Deploy using Docker or your platform
- [ ] Verify all endpoints work on production URLs
- [ ] Test email functionality (approvals, password reset)

---

## Git Workflow

### Development → GitHub → Production

```bash
# 1. Make changes locally
# Edit files in your branch

# 2. Test locally
# Verify everything works on localhost

# 3. Commit and push to GitHub
git add .
git commit -m "feat: description"
git push origin main

# 4. Deploy to production (when ready)
./switch-env.sh prod
# Update .env files with production secrets
docker compose up --build -d
```

### Important Notes

- **NEVER commit `.env` files** - they contain secrets
- `.env` files are ignored by `.gitignore`
- Always use `.env.example` and `.env.development` templates
- Production `.env` should only exist on your production server

---

## Resources

- **Vite Docs:** https://vitejs.dev/
- **React Docs:** https://react.dev/
- **Express Docs:** https://expressjs.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **JWT:** https://jwt.io/

---

## Questions or Issues?

Check the troubleshooting section above or review the logs:

```bash
# Backend logs
cd backend && npm run dev

# Frontend logs
cd frontend && npm run dev
```
