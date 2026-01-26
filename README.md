## Production Readiness

- Hardened backend with security headers (Helmet), rate limiting, improved CORS (comma-separated origins), and proxy trust.
- Idempotent migrations runner (`npm run migrate`) with tracking and safe re-runs.
- Admin email-based approval flow: signup triggers an approval link to the admin; clicking the link activates the account.
- Environment templates: backend `.env.example` and frontend `.env.example` set for production defaults.
- Dockerfiles for backend and frontend, plus `docker-compose.yml` for local prod-like runs.

### Deploy Steps (Docker Compose)

1. Copy envs:
	- Backend: create `backend/.env` from `backend/.env.example` and fill secrets.
	- Frontend: create `frontend/.env` from `frontend/.env.example` and set `VITE_API_BASE_URL`.
2. Build and run:

```bash
docker compose up --build -d
```

### Migrations

Run migrations safely:

```bash
cd backend
npm run migrate
```

### GitHub

Repo is connected to GitHub remote (`origin`). Push changes:

```bash
git push origin main
```

### Important Env Vars

- `API_PUBLIC_URL`: Public API base (used in approval links)
- `ADMIN_EMAIL`: Where approval emails are sent
- `CORS_ORIGIN`: Comma-separated origins (avoid `*` in production)
- `JWT_SECRET`: Long random secret

# ATS - Applicant Tracking System

A modern, full-stack Applicant Tracking System built with React, TypeScript, Node.js, Express, and PostgreSQL.

## Features

- 🔐 **Authentication & Authorization** - Secure JWT-based auth with role-based access (Admin/Recruiter)
- 👥 **Candidate Management** - Track candidates through the hiring pipeline
- 💼 **Job Management** - Create and manage job positions and postings
- 📊 **Dashboard Analytics** - Real-time insights on hiring metrics
- 👨‍💼 **Team Management** - Add and manage recruiters
- 📧 **Email Integration** - Password reset via email (Gmail/SMTP)
- 📄 **Resume Upload** - Support for PDF resume uploads
- 🎨 **Modern UI** - Clean, responsive interface with Tailwind CSS

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation

### Backend

- Node.js with Express
- PostgreSQL database (Supabase compatible)
- JWT authentication
- Nodemailer for emails
- bcryptjs for password hashing

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+ (or Supabase account)
- Gmail account (for email features) or SMTP service

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ATS
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual credentials
```

Configure your `.env` file with:

- Database credentials (PostgreSQL/Supabase)
- JWT secret (generate a strong random string)
- Email service credentials (Gmail or SMTP)

Run database migrations:

```bash
npm run migrate
```

Start the backend:

```bash
npm run dev
```

Backend will run on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy environment file
cp .env.example .env
# Edit if needed (default: http://localhost:5000)
```

Start the frontend:

```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Environment Variables

### Backend (.env)

See `backend/.env.example` for full configuration. Key variables:

- `DB_HOST` - PostgreSQL host
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Strong secret for JWT tokens
- `EMAIL_USER` - Email service username
- `EMAIL_PASSWORD` - Email service password

⚠️ **Never commit your `.env` file to git!**

### Frontend (.env)

- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:5000)

## Database Schema

The application uses PostgreSQL with the following main tables:

- `accounts` - User accounts with role-based access
- `candidates` - Candidate information and status tracking
- `jobs` - Job postings
- `job_positions` - Job position templates
- `password_reset_tokens` - Secure password reset tokens

Migrations are in `backend/sql/` directory.

## Default Login

After setting up, create your first admin account via the signup page at:
http://localhost:5173/signup

## Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the app password in your `.env` file

### SMTP Setup

Configure your SMTP provider details (Zoho, SendGrid, AWS SES, etc.) in `.env`

## Security

- All passwords are hashed using bcryptjs
- JWT tokens for secure authentication
- SQL injection protection via parameterized queries
- CORS configuration for API security
- Environment variables for sensitive data
- Role-based access control

See [SECURITY.md](SECURITY.md) for detailed security information.

## Project Structure

```
ATS/
├── backend/
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth middleware
│   │   ├── services/     # Email service
│   │   ├── db.js         # Database connection
│   │   └── server.js     # Express app
│   ├── sql/              # Database migrations
│   ├── uploads/          # Resume uploads
│   └── .env.example      # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # React pages
│   │   ├── components/   # Reusable components
│   │   ├── auth/         # Auth context & routes
│   │   └── App.tsx       # Main app component
│   └── .env.example      # Environment template
│
├── .gitignore            # Git ignore rules
├── SECURITY.md           # Security guidelines
└── README.md             # This file
```

## API Endpoints

### Authentication

- `POST /auth/signup` - Create admin account
- `POST /auth/login` - Login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

### Candidates

- `GET /candidates` - List all candidates
- `POST /candidates` - Create candidate
- `PUT /candidates/:id` - Update candidate
- `DELETE /candidates/:id` - Delete candidate

### Jobs

- `GET /jobs` - List all jobs
- `POST /jobs` - Create job
- `PUT /jobs/:id` - Update job
- `DELETE /jobs/:id` - Delete job

### Team Management (Admin only)

- `GET /auth/recruiters` - List team members
- `POST /auth/recruiters` - Add team member
- `PUT /auth/recruiters/:id/password` - Reset team member password

## Development

### Backend

```bash
cd backend
npm run dev  # Auto-restart on file changes
```

### Frontend

```bash
cd frontend
npm run dev  # Hot module replacement
```

### Database Migrations

```bash
cd backend
npm run migrate  # Run all migrations
```

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Update `FRONTEND_URL` to your production domain
3. Configure production database with SSL
4. Use strong, unique JWT secret
5. Enable HTTPS for all connections
6. Set up proper CORS origins
7. Configure production email service
8. Review [SECURITY.md](SECURITY.md) checklist

## Troubleshooting

See documentation files:

- [DATABASE_TROUBLESHOOTING.md](DATABASE_TROUBLESHOOTING.md)
- [EMAIL_CONFIGURATION.md](EMAIL_CONFIGURATION.md)
- [FORGOT_PASSWORD_FEATURE.md](FORGOT_PASSWORD_FEATURE.md)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

[Add support information here]
