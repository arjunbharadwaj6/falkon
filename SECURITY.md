# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this ATS (Applicant Tracking System), please report it by emailing the maintainers. Please do not create a public GitHub issue.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Measures

### Environment Variables
- All sensitive credentials are stored in `.env` files
- `.env` files are excluded from git via `.gitignore`
- `.env.example` files provide templates without sensitive data

### Database Security
- PostgreSQL with SSL/TLS encryption for production
- Parameterized queries to prevent SQL injection
- Password hashing using bcryptjs with salt rounds

### Authentication & Authorization
- JWT-based authentication with secure secret keys
- Role-based access control (Admin/Recruiter)
- Password reset tokens with 1-hour expiration
- Secure password requirements (minimum 8 characters)

### API Security
- CORS configuration for trusted origins only
- Input validation and sanitization
- Error messages don't expose sensitive information

### Best Practices
1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong JWT secrets** - Minimum 32 characters, randomly generated
3. **Enable database SSL** - Always use SSL/TLS in production
4. **Update dependencies regularly** - Run `npm audit` and fix vulnerabilities
5. **Use environment-specific configs** - Different secrets for dev/staging/prod
6. **Rotate credentials periodically** - Change database passwords, JWT secrets regularly
7. **Enable 2FA for email** - Use app-specific passwords for Gmail/SMTP

## Pre-Deployment Checklist

Before deploying to production:

- [ ] Change default JWT_SECRET to a strong, unique value
- [ ] Use production database credentials (not defaults)
- [ ] Enable database SSL (DB_SSL=true)
- [ ] Configure production email service credentials
- [ ] Set NODE_ENV=production
- [ ] Update FRONTEND_URL to production domain
- [ ] Configure CORS_ORIGIN to production domain
- [ ] Review and update password policies
- [ ] Enable HTTPS for all connections
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Review file upload restrictions
- [ ] Test password reset flow in production

## Dependencies

Keep dependencies up to date:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# For major version updates
npm outdated
```

## Secrets Management

### DO NOT commit:
- `.env` files
- Database credentials
- API keys
- JWT secrets
- Email passwords
- Any file containing sensitive data

### Safe to commit:
- `.env.example` (with placeholder values)
- `.gitignore` (properly configured)
- Code without hardcoded secrets

## Contact

For security concerns, contact the repository maintainers.
