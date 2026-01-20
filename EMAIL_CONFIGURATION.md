# Email Configuration Guide

## Quick Start

The password reset feature now supports three modes:

### Mode 1: Development Mode (Default - No Configuration Needed)

If no email credentials are configured, the system will log password reset requests to the console instead of sending emails. This is perfect for development and testing.

**What happens:**

- User requests password reset
- Reset link is logged to console: `[EMAIL MOCK] Reset link: http://localhost:5173/reset-password?token=...`
- Frontend shows success message (for real users, check their email in production)
- Backend continues to work without errors

**No configuration needed** - just use it!

---

### Mode 2: Gmail Configuration

Perfect for small deployments and testing.

**Steps:**

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
3. Add to your `.env` file:

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=noreply@ats.com
```

**Troubleshooting:**

- Make sure 2FA is enabled before generating app password
- Use the exact password Google provides (including spaces)
- For corporate Gmail accounts, contact your admin

---

### Mode 3: SMTP Server Configuration

Perfect for production with services like SendGrid, Mailgun, AWS SES, etc.

**Example with SendGrid:**

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@ats.com
```

**Example with AWS SES:**

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ses_username
SMTP_PASSWORD=your_ses_password
EMAIL_FROM=your-verified-email@example.com
```

**Example with Mailgun:**

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@sandbox123.mailgun.org
SMTP_PASSWORD=your_mailgun_password
EMAIL_FROM=noreply@ats.com
```

---

### Mode 4: Local Testing with MailHog (Recommended for Development)

Perfect for testing email without sending real emails.

**Setup:**

1. Install MailHog: https://github.com/mailhog/MailHog
2. Run MailHog: `mailhog`
3. MailHog will start:
   - SMTP server on port 1025 (for receiving emails)
   - Web UI on http://localhost:1025 (to view emails)

4. No `.env` configuration needed - just use MailHog's default:

```bash
SMTP_HOST=localhost
SMTP_PORT=1025
```

5. When you test the forgot password feature, emails will appear in http://localhost:1025/

---

## Testing Your Configuration

### Check if Email is Working

1. Start the backend:

```bash
npm run dev
```

You should see one of:

- `✓ Email transporter configured for Gmail`
- `✓ Email transporter configured for SMTP: smtp.your-provider.com:587`
- `⚠ No email configuration found. Email notifications will be logged only.`

### Test Forgot Password Flow

1. Go to http://localhost:5173/login
2. Click "Forgot password?"
3. Enter any email address
4. Check backend console or email inbox
   - Development mode: Check console logs
   - MailHog: Check http://localhost:1025
   - Real email: Check email inbox

---

## Common Issues

**Q: "Failed to send reset email" error**

- A: This means email is not configured. Set up one of the modes above.

**Q: "⚠ Email transporter not configured"**

- A: No email settings found. Either configure email or use development mode (emails logged to console).

**Q: Gmail authentication failed**

- A: Make sure you:
  1. Have 2FA enabled
  2. Used the App Password (not your Gmail password)
  3. Copied the password exactly (including spaces)

**Q: Can't connect to SMTP server**

- A: Check:
  1. SMTP_HOST is correct
  2. SMTP_PORT is correct (usually 587 for TLS)
  3. SMTP_USER and SMTP_PASSWORD are correct
  4. Firewall allows outbound connection to SMTP_PORT

**Q: Email shows wrong sender address**

- A: Update `EMAIL_FROM` in `.env` to your verified sender email

---

## Production Checklist

Before deploying to production:

- [ ] Choose an email service (SendGrid, AWS SES, Mailgun, etc.)
- [ ] Set up SMTP credentials with that service
- [ ] Configure `.env` with SMTP settings
- [ ] Verify email domain is set up and authenticated
- [ ] Test forgot password flow with a real email account
- [ ] Set `FRONTEND_URL` to your production frontend URL
- [ ] Monitor email delivery (some services have dashboards)
- [ ] Consider email rate limiting if getting too many requests
- [ ] Set up logging/alerts for email failures

---

## Environment Variables Reference

```bash
# Email Configuration (choose one)

# Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# SMTP Server
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password

# Common settings
EMAIL_FROM=noreply@ats.com
FRONTEND_URL=http://localhost:5173
```

---

## Support

If you need help, check the main [FORGOT_PASSWORD_FEATURE.md](../FORGOT_PASSWORD_FEATURE.md) documentation or review the email service logs.
