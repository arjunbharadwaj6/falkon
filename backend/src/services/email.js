import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter
let transporter;
let transporterConfigured = false;

// Initialize transporter based on environment variables
function initializeTransporter() {
  try {
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
