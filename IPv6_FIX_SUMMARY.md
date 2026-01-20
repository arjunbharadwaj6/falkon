# IPv6 Connectivity Fix - Complete Summary

## Problem

Your backend application on Render was failing with **`connect ENETUNREACH`** errors when trying to connect to Supabase PostgreSQL. The root cause: Render does not support IPv6 routing, but DNS was resolving your database hostname to IPv6 addresses.

**Error Example:**

```
FATAL: Database pool initialization failed: connect ENETUNREACH 2600:1f13:838:6e15:be47:1aaa:c5bc:a20:5432
```

## Solution Implemented

Complete IPv4-only DNS resolution forcing at the Node.js level and pg-pool configuration level.

### Changes Made

#### 1. **backend/src/db.js** (CRITICAL)

- **Removed:** All references to `dns.lookup()` which allows IPv6 fallback
- **Added:** `dns.setDefaultResultOrder('ipv4first')` at module load
- **Implemented:** Custom `dns.resolve4()` lookup function that:
  - Only resolves to IPv4 addresses
  - Rejects any IPv6 results
  - Throws error with helpful message if only IPv6 is available
  - Detects if hostname is already an IPv4 address and uses it directly

**Key Code:**

```javascript
// CRITICAL: Force IPv4-only at DNS level
dns.setDefaultResultOrder("ipv4first");

// Custom lookup ONLY uses dns.resolve4 (IPv4 ONLY)
lookup: (hostname, options, callback) => {
  dns.resolve4(hostname, (err, addresses) => {
    if (err) {
      console.error(`DNS resolve4 failed for ${hostname}: ${err.message}`);
      return callback(err);
    }
    if (!addresses || addresses.length === 0) {
      return callback(new Error(`No IPv4 addresses found for ${hostname}`));
    }
    // Return first IPv4 address with family=4 flag
    callback(null, addresses[0], 4);
  });
};

// Pool configuration
pool = new Pool({
  host: resolvedDbHost,
  family: 4, // Disable IPv6
  // ... other config
});
```

#### 2. **backend/src/routes/auth.js** (ERROR HANDLING)

- Added specific error handling for `ENETUNREACH` and `ECONNREFUSED`
- Returns HTTP 503 (Service Unavailable) when database connection fails
- Prevents confusing 500 errors during temporary connectivity issues

**Error Handler:**

```javascript
} catch (error) {
  console.error('Signup error:', error);
  if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Database connection failed. Please try again.'
    });
  }
  next(error);
}
```

### Git Commits

```
67eebce - Remove duplicate code - finalize IPv4-only DNS resolution
5889439 - Use dns.resolve4 for IPv4-ONLY resolution, fail fast if IPv6 returned
5c2d1e2 - CRITICAL FIX: Disable IPv6 and force IPv4-only database connections
```

## Why This Works

1. **`dns.resolve4()` is IPv4-ONLY**: Unlike `dns.lookup()` which is IPv4-first but IPv6-capable, `dns.resolve4()` **never** returns IPv6 addresses.

2. **Applied at Pool Initialization**: DNS resolution happens before pg-pool creates the connection, ensuring the resolved IPv4 address is used.

3. **Custom Lookup Callback**: Even if pg-pool internally attempts DNS resolution, our custom lookup function forces IPv4-only behavior.

4. **Fallback Handling**: If DNS resolution fails, the code detects if the hostname is already an IPv4 address and uses it directly.

## What to Do Next

### 1. Redeploy on Render

The code is already pushed to GitHub. Just redeploy your backend service on Render:

- Go to your Render dashboard
- Navigate to your backend service
- Click "Deploy" or wait for automatic deployment from main branch

### 2. Monitor Logs

Watch for this success message:

```
✅ Database connection verified at: 2024-...
✓ Database pool initialized successfully (IPv4 only)
```

### 3. Rotate Exposed Credentials (IMPORTANT!)

Your credentials were visible in chat. Rotate immediately:

**Supabase DB Password:**

1. Go to https://supabase.com → Project → Database → Users
2. Reset password for your database user
3. Update `DB_PASSWORD` in Render environment variables

**Zoho Email Password:**

1. Go to Zoho Mail Admin Panel
2. Generate a new app password
3. Update `EMAIL_PASSWORD` in Render environment variables

## Verification Checklist

- [ ] Backend redeploys successfully on Render
- [ ] Logs show "Database connection verified" message
- [ ] Login endpoint works without ENETUNREACH errors
- [ ] Candidates, Jobs, Dashboard pages load data successfully
- [ ] Database credentials have been rotated

## Troubleshooting

If you still see ENETUNREACH errors:

1. **Check Render environment variables** - Ensure they match exactly:

   ```
   DB_HOST: db.uerqcnmmsujzspgyrass.supabase.co
   DB_PORT: 5432
   DB_USER: postgres
   DB_PASSWORD: [your new password]
   DB_NAME: postgres
   DB_SSL: true
   ```

2. **Verify no IPv6 in logs** - Logs should NOT show `2600:` addresses

3. **Alternative: Use IPv4 directly** - If DNS resolution is still problematic:
   - Go to Supabase dashboard
   - Find the IPv4 address for your database
   - Set `DB_HOST` to that IPv4 address directly instead of hostname

## Technical Details

### Why Render Lacks IPv6

Render is a cloud platform that doesn't route IPv6 traffic. When your application attempts to connect to an IPv6 address, the connection fails immediately with ENETUNREACH (address unreachable).

### DNS Resolution Chain

1. Application calls `dns.resolve4()` → returns only IPv4
2. Connection string built with IPv4 address
3. pg-pool connects to IPv4 address successfully
4. Custom lookup callback ensures no IPv6 fallback

### Files NOT Changed

- No changes to package.json dependencies
- No changes to frontend code
- No changes to database schema
- Only DNS resolution and error handling updated
