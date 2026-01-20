# Database Connection Troubleshooting Guide

## Connection Improvements Made

✅ Increased connection timeout from 5s to 10s
✅ Enabled TCP keep-alive to maintain connections
✅ Added automatic retry logic with exponential backoff (2 retries)
✅ Better error handling for connection timeouts
✅ Graceful error messages for service unavailability

## Testing Database Connection

Run the connection test script:

```bash
cd backend
node test-db-connection.js
```

This will:

- Test connection to Supabase
- Verify SSL configuration
- Check accounts and password_reset_tokens tables
- Provide troubleshooting tips if connection fails

## Common Issues

### "Connection timeout" Error

**Causes:**

- Temporary network issues
- Supabase database is paused (free tier)
- IP not allowlisted in Supabase
- Firewall blocking outbound connections

**Solutions:**

1. Check Supabase dashboard - database may be paused
2. In Supabase, go to Settings → Database → Connection Pooling
3. Ensure your IP is allowed (or disable IP restrictions for testing)
4. Wait a moment and try again (may be temporary)

### "Connection terminated unexpectedly"

**Causes:**

- Long-running idle connections
- Database restarted
- Network interruption

**Solutions:**

- Server will automatically retry (up to 2 times)
- Connection pool will create new connections
- If persistent, restart the backend server

### Supabase Free Tier Issues

Supabase free tier databases pause after inactivity:

- Database pauses after ~7 days of inactivity
- First connection after pause takes 30-60 seconds
- Subsequent connections are fast

**Solution:** Visit Supabase dashboard to wake up the database

## Configuration

Current pool settings in `src/db.js`:

```javascript
{
  max: 20,                      // Max connections in pool
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s
  statement_timeout: 10000,     // Query timeout 10s
  query_timeout: 10000,         // Query timeout 10s
  keepAlive: true,              // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // First keep-alive after 10s
}
```

## Retry Logic

Queries automatically retry on connection errors:

- 1st attempt: immediate
- 2nd attempt: after 1 second
- 3rd attempt: after 2 seconds
- After 3 attempts: returns 503 error to user

## Monitoring

Check backend logs for:

- `Database query failed (attempt X/3), retrying...` - Connection issues
- `Database query error: Connection timeout` - Persistent issues
- `Executed query` - Successful queries with timing

## Emergency Fix

If database is completely unavailable:

1. Comment out database calls in routes temporarily
2. Return mock responses
3. Fix database connection
4. Uncomment real database calls

## Production Recommendations

For production, consider:

- Using Supabase Pro tier (no auto-pause)
- Setting up monitoring/alerting
- Implementing circuit breaker pattern
- Adding request queuing for high load
- Using connection pooler (PgBouncer)
