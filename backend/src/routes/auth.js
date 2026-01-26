import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendApprovalNotificationEmail, sendApprovedEmail, sendAdminApprovalEmail } from '../services/email.js';

const router = express.Router();

const normalizeLoginResponse = (account) => ({
  id: account.id,
  companyName: account.companyName,
  email: account.email,
  username: account.username,
  role: account.role,
  parentAccountId: account.parentAccountId,
  isApproved: account.isApproved,
});

router.post('/signup', async (req, res, next) => {
  try {
    const { companyName, email, username, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    if (!companyName || !username) {
      return res.status(400).json({ error: 'company name and username are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const existing = await query('SELECT id FROM accounts WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'account with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Get super admin ID (account with no parent)
    const superAdminResult = await query(
      'SELECT id FROM accounts WHERE role = $1 AND parent_account_id IS NULL LIMIT 1',
      ['admin']
    );
    const superAdminId = superAdminResult.rows.length ? superAdminResult.rows[0].id : null;

    // New accounts are created as regular admins (under super admin)
    const insert = await query(
      `INSERT INTO accounts (company_name, email, username, password_hash, role, is_approved, parent_account_id)
       VALUES ($1, $2, $3, $4, 'admin', false, $5)
       RETURNING id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", is_approved AS "isApproved", created_at`,
      [companyName, email.toLowerCase(), username.toLowerCase(), passwordHash, superAdminId]
    );

    const account = insert.rows[0];

    // Generate admin approval token
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    try {
      await query(
        `INSERT INTO account_approval_tokens (account_id, token, email, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [account.id, approvalToken, process.env.ADMIN_EMAIL || account.email, expiresAt]
      );
    } catch (tokenError) {
      console.error('Failed to create approval token:', tokenError.message);
      // Continue even if token creation fails - user account is still created
    }

    // Send admin approval email with link (async, do not block response)
    const apiUrl = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const approvalLink = `${apiUrl}/auth/approve-by-token?token=${approvalToken}`;
    Promise.resolve()
      .then(() => sendAdminApprovalEmail(account.email, account.username, account.companyName, approvalLink))
      .catch((emailError) => {
        console.error('Failed to send admin approval email:', emailError.message);
      });

    // Return response indicating account created, awaiting admin approval
    res.status(201).json({ 
      message: 'Account created successfully! Await admin approval to access all features.',
      account: {
        ...normalizeLoginResponse(account),
        isApproved: false
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { rows } = await query(
      `SELECT id, company_name AS "companyName", email, username, password_hash, role, parent_account_id AS "parentAccountId", is_approved AS "isApproved"
       FROM accounts WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const account = rows[0];
    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    // Check if admin account is approved
    if (account.role === 'admin' && !account.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please try again later.' });
    }

    const token = signToken({ accountId: account.id, email: account.email, role: account.role, parentAccountId: account.parentAccountId, isApproved: account.isApproved });
    res.json({ token, account: normalizeLoginResponse(account) });
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
    next(error);
  }
});

router.put('/profile', authRequired, async (req, res, next) => {
  try {
    const { companyName, username } = req.body;
    const accountId = req.user.accountId;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    // Recruiters cannot change company name
    let nextCompanyName = companyName;
    if (req.user.role === 'recruiter') {
      const current = await query('SELECT company_name FROM accounts WHERE id = $1', [accountId]);
      if (!current.rows.length) {
        return res.status(404).json({ error: 'account not found' });
      }
      nextCompanyName = current.rows[0].company_name;
    } else if (!companyName) {
      return res.status(400).json({ error: 'company name is required' });
    }

    // Check if username is already taken by another account
    const existing = await query('SELECT id FROM accounts WHERE username = $1 AND id != $2', [username.toLowerCase(), accountId]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'username already taken' });
    }

    const update = await query(
      'UPDATE accounts SET company_name = $1, username = $2 WHERE id = $3 RETURNING id, company_name AS "companyName", email, username',
      [nextCompanyName, username.toLowerCase(), accountId]
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: 'account not found' });
    }

    res.json({ account: { ...update.rows[0], role: req.user.role, parentAccountId: req.user.parentAccountId } });
  } catch (error) {
    next(error);
  }
});

router.put('/password', authRequired, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const accountId = req.user.accountId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'new password must be at least 8 characters' });
    }

    // Verify current password
    const { rows } = await query('SELECT password_hash FROM accounts WHERE id = $1', [accountId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'account not found' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'current password is incorrect' });
    }

    // Update password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [newPasswordHash, accountId]);

    res.json({ message: 'password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// Admin-only: list team members (recruiters and admins) created under this admin
router.get('/recruiters', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can list team members' });
    }

    const { rows } = await query(
      `SELECT id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", created_at AS "createdAt"
       FROM accounts
       WHERE (role = 'recruiter' OR role = 'admin') AND parent_account_id = $1
       ORDER BY created_at DESC`,
      [req.user.accountId]
    );

    res.json({ recruiters: rows });
  } catch (error) {
    next(error);
  }
});

// Super admin: list all accounts with creator info
router.get('/accounts', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' || req.user.parentAccountId) {
      return res.status(403).json({ error: 'Only super admin can list all accounts' });
    }

    const { rows } = await query(
      `SELECT a.id, a.company_name AS "companyName", a.email, a.username, a.role,
              a.is_approved AS "isApproved", a.created_at AS "createdAt", a.approved_at AS "approvedAt",
              a.parent_account_id AS "parentAccountId", a.created_by AS "createdBy",
              (SELECT email FROM accounts ac WHERE ac.id = a.created_by) AS "createdByEmail"
       FROM accounts a
       ORDER BY a.created_at DESC`
    );

    res.json({ accounts: rows });
  } catch (error) {
    next(error);
  }
});

// Admin-only: create team members (recruiters or admins) under this admin
router.post('/recruiters', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create team members' });
    }

    const { email, username, password, role = 'recruiter' } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username, and password are required' });
    }

    if (!['recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be recruiter or admin' });
    }

    const existing = await query('SELECT id FROM accounts WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'account with this email or username already exists' });
    }

    const adminAccount = await query('SELECT company_name FROM accounts WHERE id = $1', [req.user.accountId]);
    const companyName = adminAccount.rows[0]?.company_name || 'Team Member';

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await query(
      `INSERT INTO accounts (company_name, email, username, password_hash, role, parent_account_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", created_at` ,
      [companyName, email.toLowerCase(), username.toLowerCase(), passwordHash, role, req.user.accountId, req.user.accountId]
    );

    const account = insert.rows[0];
    res.status(201).json({ account: normalizeLoginResponse(account) });
  } catch (error) {
    next(error);
  }
});

// Admin-only: reset recruiter password
router.put('/recruiters/:id/password', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reset recruiter passwords' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }

    // Ensure target is a recruiter under this admin
    const target = await query(
      'SELECT id FROM accounts WHERE id = $1 AND role = $2 AND parent_account_id = $3',
      [id, 'recruiter', req.user.accountId]
    );

    if (!target.rows.length) {
      return res.status(404).json({ error: 'recruiter not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// Forgot password - generate and send reset token
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Check if account exists
    let rows;
    try {
      const result = await query(
        'SELECT id, email FROM accounts WHERE email = $1',
        [email.toLowerCase()]
      );
      rows = result.rows;
    } catch (dbError) {
      console.error('Database error in forgot-password:', dbError.message);
      // Return generic error for connection issues
      if (dbError.message.includes('timeout') || dbError.message.includes('Connection')) {
        return res.status(503).json({ error: 'Service temporarily unavailable. Please try again in a moment.' });
      }
      throw dbError;
    }

    if (!rows.length) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const account = rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store token in database
    try {
      await query(
        `INSERT INTO password_reset_tokens (account_id, token, email, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [account.id, hashedToken, account.email, expiresAt]
      );
    } catch (dbError) {
      console.error('Database error storing reset token:', dbError.message);
      if (dbError.message.includes('timeout') || dbError.message.includes('Connection')) {
        return res.status(503).json({ error: 'Service temporarily unavailable. Please try again in a moment.' });
      }
      throw dbError;
    }

    // Send reset email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(account.email)}`;

    try {
      await sendPasswordResetEmail(account.email, resetLink);
      console.log(`Password reset token generated for ${account.email}`);
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
      // Still return success to not reveal if email exists
      // In production, you might want to log this for monitoring
      // The token is already stored in DB, user won't be able to use it if email wasn't sent
      // But for now we'll just log and continue
    }

    res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// Verify and reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'email, token, and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Get the reset token record
    const { rows: tokenRows } = await query(
      `SELECT account_id, email, expires_at, used FROM password_reset_tokens
       WHERE token = $1 AND email = $2`,
      [hashedToken, email.toLowerCase()]
    );

    if (!tokenRows.length) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    const tokenRecord = tokenRows[0];

    // Check if token is already used
    if (tokenRecord.used) {
      return res.status(401).json({ error: 'This reset token has already been used' });
    }

    // Check if token is expired
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({ error: 'Reset token has expired' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update account password
    await query(
      'UPDATE accounts SET password_hash = $1 WHERE id = $2',
      [passwordHash, tokenRecord.account_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [hashedToken]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
});

// Get pending account approvals (for first admin or super admin)
router.get('/pending-approvals', authRequired, async (req, res, next) => {
  try {
    // Only the first admin (no parent_account_id) can approve other admins
    if (req.user.role !== 'admin' || req.user.parentAccountId) {
      return res.status(403).json({ error: 'Only super admin can view pending approvals' });
    }

    const { rows } = await query(
      `SELECT id, company_name AS "companyName", email, username, role, created_at AS "createdAt", is_approved AS "isApproved"
       FROM accounts
       WHERE is_approved = false AND role = 'admin'
       ORDER BY created_at DESC`
    );

    res.json({ pendingApprovals: rows });
  } catch (error) {
    next(error);
  }
});

// Approve a new admin account
router.post('/approve-account/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only the first admin (no parent_account_id) can approve other admins
    if (req.user.role !== 'admin' || req.user.parentAccountId) {
      return res.status(403).json({ error: 'Only super admin can approve accounts' });
    }

    // Get the account to be approved
    const { rows: accountRows } = await query(
      `SELECT id, email, username, company_name AS "companyName", is_approved AS "isApproved"
       FROM accounts WHERE id = $1`,
      [id]
    );

    if (!accountRows.length) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountRows[0];

    if (account.isApproved) {
      return res.status(400).json({ error: 'Account is already approved' });
    }

    // Update approval status
    await query(
      `UPDATE accounts 
       SET is_approved = true, approved_at = NOW(), approved_by = $1
       WHERE id = $2`,
      [req.user.accountId, id]
    );

    // Send approval email to the user
    try {
      await sendApprovedEmail(account.email, account.username);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError.message);
      // Continue even if email fails
    }

    res.json({ message: 'Account approved successfully', account });
  } catch (error) {
    next(error);
  }
});

// Reject a pending admin account
router.post('/reject-account/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Only the first admin (no parent_account_id) can reject other admins
    if (req.user.role !== 'admin' || req.user.parentAccountId) {
      return res.status(403).json({ error: 'Only super admin can reject accounts' });
    }

    // Get the account to be rejected
    const { rows: accountRows } = await query(
      `SELECT id, email, username, is_approved AS "isApproved"
       FROM accounts WHERE id = $1`,
      [id]
    );

    if (!accountRows.length) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountRows[0];

    if (account.isApproved) {
      return res.status(400).json({ error: 'Cannot reject an already approved account' });
    }

    // Delete the rejected account
    await query('DELETE FROM accounts WHERE id = $1', [id]);

    res.json({ message: 'Account rejected and deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Verify email with approval token
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ error: 'token and email are required' });
    }

    // Find the approval token
    const tokenRecord = await query(
      `SELECT id, account_id, token, used, expires_at
       FROM account_approval_tokens
       WHERE token = $1 AND email = $2`,
      [token, email.toLowerCase()]
    );

    if (!tokenRecord.rows.length) {
      return res.status(404).json({ error: 'Invalid or expired verification token' });
    }

    const approval = tokenRecord.rows[0];

    // Check if token is already used
    if (approval.used) {
      return res.status(400).json({ error: 'This verification link has already been used' });
    }

    // Check if token has expired
    if (new Date(approval.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This verification link has expired. Please sign up again.' });
    }

    // Mark account as approved
    const updateResult = await query(
      `UPDATE accounts
       SET is_approved = true, approved_at = NOW()
       WHERE id = $1
       RETURNING id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", is_approved AS "isApproved"`,
      [approval.account_id]
    );

    if (!updateResult.rows.length) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Mark token as used
    await query(
      `UPDATE account_approval_tokens
       SET used = true, used_at = NOW()
       WHERE id = $1`,
      [approval.id]
    );

    const account = updateResult.rows[0];

    // Create a new token for the verified user
    const authToken = signToken({ accountId: account.id, email: account.email, role: account.role, parentAccountId: account.parentAccountId, isApproved: true });

    res.json({ 
      message: 'Email verified successfully! You can now log in.',
      token: authToken,
      account: normalizeLoginResponse(account)
    });
  } catch (error) {
    console.error('Email verification error:', error);
    if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection failed. Please try again.' });
    }
    next(error);
  }
});

// Admin approval via token (HTML response for convenience)
router.get('/approve-by-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
        <html><body style="font-family:sans-serif">
          <h2>Invalid Approval Link</h2>
          <p>Missing token in request.</p>
        </body></html>
      `);
    }

    const tokenRecord = await query(
      `SELECT id, account_id, token, used, expires_at FROM account_approval_tokens WHERE token = $1`,
      [token]
    );

    if (!tokenRecord.rows.length) {
      return res.status(404).send(`
        <html><body style="font-family:sans-serif">
          <h2>Approval Link Not Found</h2>
          <p>This approval link is invalid or may have been used already.</p>
        </body></html>
      `);
    }

    const approval = tokenRecord.rows[0];
    if (approval.used) {
      return res.status(400).send(`
        <html><body style="font-family:sans-serif">
          <h2>Approval Link Already Used</h2>
          <p>This approval link has already been used.</p>
        </body></html>
      `);
    }
    if (new Date(approval.expires_at) < new Date()) {
      return res.status(400).send(`
        <html><body style="font-family:sans-serif">
          <h2>Approval Link Expired</h2>
          <p>This approval link has expired. Please ask the user to sign up again.</p>
        </body></html>
      `);
    }

    // Approve the account
    const updateResult = await query(
      `UPDATE accounts SET is_approved = true, approved_at = NOW() WHERE id = $1
       RETURNING id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", is_approved AS "isApproved"`,
      [approval.account_id]
    );

    if (!updateResult.rows.length) {
      return res.status(404).send(`
        <html><body style="font-family:sans-serif">
          <h2>Account Not Found</h2>
          <p>The account linked to this approval could not be found.</p>
        </body></html>
      `);
    }

    await query(`UPDATE account_approval_tokens SET used = true, used_at = NOW() WHERE id = $1`, [approval.id]);

    const account = updateResult.rows[0];

    // Notify user their account was approved
    try {
      await sendApprovedEmail(account.email, account.username);
    } catch (e) {
      console.error('Failed to send approved email to user:', e.message);
    }

    return res.status(200).send(`
      <html><body style="font-family:sans-serif; max-width:640px; margin:40px auto;">
        <div style="border:1px solid #e3e8ef; border-radius:12px; padding:24px;">
          <h2 style="color:#16a34a; margin-top:0;">Company Approved</h2>
          <p>The account for <strong>${account.companyName}</strong> has been approved successfully.</p>
          <p>The user <strong>${account.username || account.email}</strong> can now log in and access all features.</p>
        </div>
      </body></html>
    `);
  } catch (error) {
    console.error('Approve-by-token error:', error);
    return res.status(500).send(`
      <html><body style="font-family:sans-serif">
        <h2>Unexpected Error</h2>
        <p>Could not approve account. Please try again later.</p>
      </body></html>
    `);
  }
});

// List all accounts (super admin only)
router.get('/accounts', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' || req.user.parentAccountId) {
      return res.status(403).json({ error: 'Only super admin can view all accounts' });
    }

    const { rows } = await query(
      `SELECT a.id,
              a.company_name AS "companyName",
              a.email,
              a.username,
              a.role,
              a.is_approved AS "isApproved",
              a.created_at AS "createdAt",
              a.approved_at AS "approvedAt",
              a.parent_account_id AS "parentAccountId",
              a.created_by AS "createdBy",
              creator.email AS "createdByEmail"
       FROM accounts a
       LEFT JOIN accounts creator ON creator.id = a.created_by
       ORDER BY a.created_at DESC`
    );

    res.json({ accounts: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
