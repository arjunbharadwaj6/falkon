# Forgot Password Feature Documentation

## Overview

The ATS application now includes a complete forgot password flow that allows users to reset their password securely via email.

## Features

- **Forgot Password Page**: Users can request a password reset by entering their email address
- **Email Verification**: A secure reset link is sent to the user's registered email
- **Reset Password Page**: Users can set a new password using the secure token
- **Token Expiration**: Reset tokens expire after 1 hour for security
- **One-time Use Tokens**: Tokens can only be used once to prevent abuse

## User Flow

1. User clicks "Forgot password?" link on the login page
2. User enters their email address on the forgot password page
3. Backend generates a secure reset token and sends it via email
4. User receives an email with a reset link
5. User clicks the link and is taken to the reset password page
6. User enters and confirms their new password
7. Password is updated and user can login with new credentials

## Frontend Components

### ForgotPassword Page (`src/pages/ForgotPassword.tsx`)

- Route: `/forgot-password`
- User enters their email address
- Displays success message after submission
- Uses gradient UI matching the login page

### ResetPassword Page (`src/pages/ResetPassword.tsx`)

- Route: `/reset-password?token={token}&email={email}`
- User enters new password with confirmation
- Validates password strength (min 8 characters)
- Shows password visibility toggle
- Redirects to login after successful reset

### Login Page Update

- Added "Forgot password?" link under password field
- Links to the forgot password page

## Backend API Endpoints

### POST `/auth/forgot-password`

Request:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "message": "If an account exists with this email, a reset link has been sent."
}
```

**Note**: The endpoint returns the same message regardless of whether an account exists (for security)

### POST `/auth/reset-password`

Request:

```json
{
  "email": "user@example.com",
  "token": "reset_token_from_email",
  "newPassword": "newPassword123"
}
```

Response (Success):

```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```

Response (Error):

```json
{
  "error": "Invalid or expired reset token"
}
```

## Database

A new table `password_reset_tokens` was created with the following structure:

- `id`: UUID primary key
- `account_id`: Reference to accounts table
- `token`: Hashed reset token
- `email`: User's email address
- `expires_at`: Token expiration timestamp
- `used`: Boolean flag for one-time use
- `created_at`: Token creation timestamp

Migration file: `sql/007_add_password_reset_tokens.sql`

## Email Configuration

### Setup Options

#### Option 1: Gmail

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Configure environment variables:

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@ats.com
```

#### Option 2: SMTP Server

Configure your SMTP provider (SendGrid, Mailgun, etc.):

```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@ats.com
```

#### Option 3: Development (MailHog)

For local development testing without sending real emails:

1. Install MailHog: https://github.com/mailhog/MailHog
2. Run MailHog: `mailhog`
3. Access web UI at `http://localhost:1025`
4. Configure backend with local SMTP (no credentials needed)

## Environment Variables

Required environment variables in `.env`:

```bash
# Frontend URL for reset links
FRONTEND_URL=http://localhost:5173

# Email Configuration (choose one method)
# Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Or SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password

# Email sender address
EMAIL_FROM=noreply@ats.com
```

## Email Template

The password reset email includes:

- Professional branded header with gradient
- Clear instructions
- Button link to reset password
- Backup text link
- Expiration warning (1 hour)
- Security notice
- Professional footer

## Security Considerations

1. **Token Hashing**: Reset tokens are hashed using SHA256 before storage
2. **Token Expiration**: Tokens expire after 1 hour
3. **One-time Use**: Tokens can only be used once
4. **Email Obfuscation**: The API doesn't reveal if an email exists in the system
5. **HTTPS**: Ensure HTTPS is used in production
6. **Password Validation**: Passwords must be at least 8 characters

## Testing the Feature

### Frontend

```bash
cd frontend
npm run dev
```

### Backend

```bash
cd backend
npm run dev
```

### Manual Testing

1. Navigate to `http://localhost:5173/login`
2. Click "Forgot password?" link
3. Enter your email address
4. Check your email (or MailHog at `http://localhost:1025`)
5. Click the reset link
6. Enter new password and confirm
7. Login with your new password

## Troubleshooting

### Email Not Sending

1. Check environment variables are set correctly
2. Verify email service credentials
3. Check backend logs for error messages
4. Test email transporter with `verifyEmailTransporter()`

### Reset Link Not Working

1. Verify token hasn't expired (1 hour limit)
2. Ensure email parameter matches account email
3. Check token matches exactly (case-sensitive)
4. Verify frontend URL is correctly configured

### Password Reset Token Errors

- "Invalid or expired reset token": Token doesn't exist, is expired, or was already used
- "This reset token has already been used": Token was used previously
- "Reset token has expired": Token older than 1 hour

## Future Enhancements

- Account lockout after multiple failed attempts
- Email verification for account creation
- Password strength meter
- Security questions as backup
- SMS-based password reset
- Multi-factor authentication integration
