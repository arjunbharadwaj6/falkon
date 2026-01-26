import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter
let transporter;
let transporterConfigured = false;

// Initialize transporter based on environment variables
function initializeTransporter() {
  try {
    const connectionTimeout = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || '10000');
    const greetingTimeout = parseInt(process.env.EMAIL_GREETING_TIMEOUT || '10000');
    const socketTimeout = parseInt(process.env.EMAIL_SOCKET_TIMEOUT || '10000');
    if (process.env.EMAIL_SERVICE === 'gmail') {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠ Gmail email service configured but credentials missing (EMAIL_USER, EMAIL_PASSWORD)');
        transporterConfigured = false;
        return;
      }
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
      });
      transporterConfigured = true;
      console.log('✓ Email transporter configured for Gmail');
    } else if (process.env.EMAIL_SERVICE === 'zoho' || process.env.EMAIL_HOST) {
      // Support Zoho or generic SMTP configuration
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠ SMTP email service configured but credentials missing (EMAIL_USER, EMAIL_PASSWORD)');
        transporterConfigured = false;
        return;
      }
      const host = process.env.EMAIL_HOST || 'smtp.zoho.com';
      const port = parseInt(process.env.EMAIL_PORT || '465');
      const secure = process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_SECURE === true;
      
      transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: secure,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
      });
      transporterConfigured = true;
      console.log(`✓ Email transporter configured for ${process.env.EMAIL_SERVICE || 'SMTP'}: ${host}:${port}`);
    } else if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
      });
      transporterConfigured = true;
      console.log(`✓ Email transporter configured for SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
    } else {
      // Development mode - no email credentials needed
      console.warn('⚠ No email configuration found. Email notifications will be logged only.');
      transporterConfigured = false;
    }
  } catch (error) {
    console.error('✗ Error initializing email transporter:', error.message);
    transporterConfigured = false;
  }
}

initializeTransporter();

export const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@ats.com',
    to: email,
    subject: 'Password Reset Request - ATS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
          <p>Hello,</p>
          <p>You requested to reset your password for your ATS account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy and paste this link in your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${resetLink}</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email or contact support.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 11px; text-align: center;">© 2025 ATS. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  // Log in development mode if no transporter configured
  if (!transporterConfigured) {
    console.log(`[EMAIL MOCK] Password reset email would be sent to: ${email}`);
    console.log(`[EMAIL MOCK] Reset link: ${resetLink}`);
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Password reset email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send password reset email:', error.message);
    throw new Error('Failed to send reset email: ' + error.message);
  }
};

export const verifyEmailTransporter = async () => {
  if (!transporterConfigured) {
    console.warn('⚠ Email transporter not configured. Emails will be logged only.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✓ Email transporter verified successfully');
    return true;
  } catch (error) {
    console.error('✗ Email transporter verification failed:', error.message);
    return false;
  }
};

export const isEmailConfigured = () => transporterConfigured;

// Send approval notification email to admin
export const sendApprovalNotificationEmail = async (userEmail, username, companyName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@ats.com',
    to: process.env.ADMIN_EMAIL || 'admin@ats.com',
    subject: 'New Account Pending Approval - ATS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Account Pending Approval</h2>
        <p>A new admin account has been created and is waiting for your approval.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Company:</strong> ${companyName}</p>
        </div>
        <p>Please review this account and approve or reject it in the ATS admin dashboard.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `,
  };

  if (!transporterConfigured) {
    console.log(`[EMAIL MOCK] Approval notification would be sent to: ${process.env.ADMIN_EMAIL || 'admin@ats.com'}`);
    console.log(`[EMAIL MOCK] New user: ${username} (${userEmail})`);
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Approval notification email sent. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send approval notification email:', error.message);
    throw new Error('Failed to send approval notification: ' + error.message);
  }
};

// Send admin approval email with direct approval link
export const sendAdminApprovalEmail = async (userEmail, username, companyName, approvalLink) => {
  const toEmail = process.env.ADMIN_EMAIL || 'admin@ats.com';
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@ats.com',
    to: toEmail,
    subject: 'Approve New Company Account - ATS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="background: #0b3d91; color: white; padding: 18px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0;">New Company Requires Approval</h2>
        </div>
        <div style="background: #f7f9fc; padding: 24px; border: 1px solid #e3e8ef; border-radius: 0 0 8px 8px;">
          <p>A new admin account has been created and is pending company verification.</p>
          <div style="background:#fff; border:1px solid #e3e8ef; border-radius:8px; padding:16px; margin:16px 0;">
            <p><strong>Company:</strong> ${companyName}</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
          </div>
          <p>Click the button below to approve and activate this account:</p>
          <div style="text-align:center; margin: 24px 0;">
            <a href="${approvalLink}" style="background:#0b3d91; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:bold;">Approve Account</a>
          </div>
          <p style="color:#6b7280; font-size:12px;">This approval link expires in 1 hour and can be used once.</p>
          <hr style="border:none; border-top:1px solid #e3e8ef; margin:16px 0;" />
          <p style="color:#6b7280; font-size:12px; text-align:center;">If you did not request this, you can ignore this email.</p>
        </div>
      </div>
    `,
  };

  if (!transporterConfigured) {
    console.log(`[EMAIL MOCK] Admin approval email would be sent to: ${toEmail}`);
    console.log(`[EMAIL MOCK] Approval link: ${approvalLink}`);
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Admin approval email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send admin approval email:', error.message);
    throw new Error('Failed to send admin approval email: ' + error.message);
  }
};

// Send account approved email to user
export const sendApprovedEmail = async (email, username) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@ats.com',
    to: email,
    subject: 'Your Account Has Been Approved - ATS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Account Approved!</h2>
        <p>Great news, <strong>${username}</strong>!</p>
        <p>Your ATS admin account has been approved and is now active. You can now log in and access all features.</p>
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Go to Login
          </a>
        </div>
        <p>If you have any questions, please contact your administrator.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `,
  };

  if (!transporterConfigured) {
    console.log(`[EMAIL MOCK] Approval email would be sent to: ${email}`);
    console.log(`[EMAIL MOCK] User ${username} has been approved`);
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Approval email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send approval email:', error.message);
    throw new Error('Failed to send approval email: ' + error.message);
  }
};

// Send account verification email to user with approval link
export const sendAccountVerificationEmail = async (email, username, verificationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@ats.com',
    to: email,
    subject: 'Verify Your ATS Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Welcome to ATS!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
          <p>Hi <strong>${username}</strong>,</p>
          <p>Thank you for signing up for our ATS platform. To activate your account and get started, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Your Email
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy and paste this link in your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${verificationLink}</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 12px;">If you didn't create this account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 11px; text-align: center;">© 2025 ATS. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  if (!transporterConfigured) {
    console.log(`[EMAIL MOCK] Verification email would be sent to: ${email}`);
    console.log(`[EMAIL MOCK] Verification link: ${verificationLink}`);
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Verification email sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send verification email:', error.message);
    throw new Error('Failed to send verification email: ' + error.message);
  }
};
