# SPA Routing Configuration

For the React Router to work correctly on refresh/direct navigation to routes like `/jobs`, `/approvals`, etc., the web server must serve `index.html` for all non-asset requests.

## Development (Vite)

Vite handles this automatically with `npm run dev`.

## Production Deployment

### Nginx

```nginx
server {
    listen 80;
    server_name falkon.tech www.falkon.tech;

    root /var/www/falkon/frontend/dist;

    # Serve index.html for all routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache

```apache
<Directory /var/www/falkon/frontend/dist>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</Directory>
```

### Vercel (Automatic)

Vercel automatically handles SPA routing - no configuration needed.

### Netlify

Add a `_redirects` file in the public folder:

```
/* /index.html 200
```

Or use netlify.toml:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Node.js Express

```javascript
app.use(express.static("dist"));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
```

### CloudFlare Pages

Automatic - no configuration needed.

## Testing Locally

```bash
# Build the frontend
npm run build

# Serve with a simple HTTP server
npx http-server dist

# Then test: http://localhost:8080/jobs (should load, not 404)
```

If you get a 404 on refresh, the web server is not configured to serve index.html for SPA routes.
