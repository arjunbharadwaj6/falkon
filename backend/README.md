# ATS Backend Server

Production-ready backend server for Applicant Tracking System (ATS) built with Node.js, Express, and PostgreSQL.

## Features

- ✅ Express.js server with CORS and JSON parsing
- ✅ PostgreSQL connection pool with Supabase compatibility
- ✅ Environment-based configuration
- ✅ Health check endpoint with database connectivity test
- ✅ Candidates schema and REST endpoints (create/list/detail/update/delete)
- ✅ Async/await with proper error handling
- ✅ Graceful shutdown handling
- ✅ Request logging
- ✅ Production-ready structure

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL database (local or Supabase)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the example:

```bash
cp .env.example .env
```

3. Update the `.env` file with your database credentials:

```env
PORT=5000
NODE_ENV=development

# For Supabase
DB_HOST=your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=true

# For local PostgreSQL
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=ats_db
# DB_USER=postgres
# DB_PASSWORD=your-password
# DB_SSL=false
```

## Running the Server

### Development mode (with auto-reload):

```bash
npm run dev
```

### Production mode:

```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in .env)

## API Endpoints

### Root Endpoint

```
GET /
```

Returns API information and available endpoints.

### Health Check

```
GET /health
```

Returns server status and database connectivity:

```json
{
  "uptime": 123.456,
  "timestamp": 1705584000000,
  "status": "OK",
  "database": "connected",
  "environment": "development",
  "databaseTime": "2024-01-18T12:00:00.000Z",
  "databaseVersion": "PostgreSQL 15.1"
}
```

### Candidates

```
POST /api/candidates
```

Create a candidate. Example body:

```json
{
  "name": "Jane Doe",
  "position": "Frontend Engineer",
  "age": 29,
  "experience": 5,
  "status": "new",
  "extraInfo": {
    "portfolio": "https://janedoe.dev",
    "notes": "Referrer: Alex"
  }
}
```

```
GET /api/candidates
```

List all candidates.

```
GET /api/candidates/:id
```

Get details (including extra info) for one candidate.

```
PUT /api/candidates/:id
```

Update one or more fields of a candidate. Body fields are optional; only provided fields are updated.

```
DELETE /api/candidates/:id
```

Delete a candidate.

## Project Structure

```
backend/
├── src/
│   ├── server.js         # Main server file
│   ├── db.js             # Database connection pool
│   └── routes/
│       ├── health.js     # Health check route
│       └── candidates.js # Candidates endpoints
├── sql/
│   └── 001_create_candidates.sql # Candidates table schema
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Database Connection

The application uses a connection pool for efficient database connections. The pool is configured with:

- Max 20 connections
- 30-second idle timeout
- 2-second connection timeout
- SSL support for Supabase and production databases

## Error Handling

The server includes:

- Global error handler for Express routes
- Database error handling with logging
- Graceful shutdown on SIGTERM/SIGINT
- 404 handler for undefined routes

## Environment Variables

| Variable    | Description                          | Default     |
| ----------- | ------------------------------------ | ----------- |
| PORT        | Server port                          | 5000        |
| NODE_ENV    | Environment (development/production) | development |
| DB_HOST     | Database host                        | -           |
| DB_PORT     | Database port                        | 5432        |
| DB_NAME     | Database name                        | -           |
| DB_USER     | Database user                        | -           |
| DB_PASSWORD | Database password                    | -           |
| DB_SSL      | Enable SSL for database              | false       |
| CORS_ORIGIN | Allowed CORS origin                  | \*          |

## Database Schema: candidates

Run the SQL to create the candidates table (works with Supabase):

```bash
# Replace with your actual database credentials from .env
psql "postgresql://postgres:YOUR_PASSWORD@your-host.supabase.co:5432/postgres" -f sql/001_create_candidates.sql

# or, if you have DATABASE_URL exported:
# psql "$DATABASE_URL" -f sql/001_create_candidates.sql
```

Table definition (sql/001_create_candidates.sql):

- `id` UUID primary key (defaults to `gen_random_uuid()`)
- `name` TEXT (required)
- `position` TEXT (required)
- `age` INTEGER (1-119)
- `experience_years` NUMERIC(4,1) (>= 0)
- `status` TEXT with allowed values: `new`, `screening`, `interview`, `offer`, `hired`, `rejected`, `on-hold`
- `extra_info` JSONB for arbitrary candidate details (e.g., resume link, notes)
- `created_at` / `updated_at` timestamps with automatic `updated_at` trigger

## Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Get your connection credentials from Project Settings → Database
3. Update your `.env` file with Supabase credentials
4. Set `DB_SSL=true` for Supabase connections

## Development

To add new routes:

1. Create a new route file in `src/routes/`
2. Import and use it in `src/server.js`

Example:

```javascript
import candidatesRouter from "./routes/candidates.js";
app.use("/api/candidates", candidatesRouter);
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure proper CORS origins
3. Use a process manager like PM2 or Docker
4. Set up proper logging and monitoring
5. Use HTTPS for all connections
6. Keep database credentials secure

## License

MIT
