import express from 'express';
import crypto from 'crypto';
import { auth, db, collections } from '../firebase.js';
import { authRequired } from '../middleware/auth-firebase.js';
import { sendPasswordResetEmail, sendApprovalNotificationEmail, sendApprovedEmail, sendAdminApprovalEmail } from '../services/email.js';

const router = express.Router();

const normalizeLoginResponse = (account) => ({
  id: account.id,
  companyName: account.companyName,
  email: account.email,
  username: account.username,
  role: account.role,
  parentAccountId: account.parentAccountId,
  isApproved: account.isApproved !== false,
});

// Username lookup endpoint (for login)
router.post('/username-lookup', async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    const usernameQuery = await db.collection(collections.accounts)
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    if (usernameQuery.empty) {
      return res.status(404).json({ error: 'username not found' });
    }

    const accountData = usernameQuery.docs[0].data();
    res.json({ email: accountData.email });
  } catch (error) {
    next(error);
  }
});

// Signup endpoint - creates user in Firebase Auth and Firestore
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

    // Check if username already exists in Firestore
    const usernameQuery = await db.collection(collections.accounts)
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    if (!usernameQuery.empty) {
      return res.status(409).json({ error: 'username already exists' });
    }

    // Get super admin ID (account with no parent)
    const superAdminQuery = await db.collection(collections.accounts)
      .where('role', '==', 'admin')
      .where('parentAccountId', '==', null)
      .limit(1)
      .get();
    
    const superAdminId = !superAdminQuery.empty ? superAdminQuery.docs[0].id : null;

    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email.toLowerCase(),
        password,
        displayName: username,
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'account with this email already exists' });
      }
      throw authError;
    }

    // Create account document in Firestore
    const accountData = {
      companyName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      role: 'admin',
      isApproved: false,
      parentAccountId: superAdminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(collections.accounts).doc(userRecord.uid).set(accountData);

    // Set custom claims (will be updated after approval)
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isApproved: false,
      parentAccountId: superAdminId,
    });

    // Generate approval token
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    try {
      await db.collection(collections.accountApprovalTokens).add({
        accountId: userRecord.uid,
        token: approvalToken,
        email: process.env.ADMIN_EMAIL || email,
        expiresAt,
        createdAt: new Date(),
      });
    } catch (tokenError) {
      console.error('Failed to create approval token:', tokenError.message);
    }

    // Send admin approval email
    const apiUrl = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const approvalLink = `${apiUrl}/auth/approve-by-token?token=${approvalToken}`;
    Promise.resolve()
      .then(() => sendAdminApprovalEmail(email, username, companyName, approvalLink))
      .catch((emailError) => {
        console.error('Failed to send admin approval email:', emailError.message);
      });

    res.status(201).json({
      message: 'Account created successfully! Await admin approval to access all features.',
      account: {
        id: userRecord.uid,
        ...accountData,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    next(error);
  }
});

// Login endpoint - validates Firebase user and returns custom token
router.post('/login', async (req, res, next) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = (identifier || email || '').toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'email/username and password are required' });
    }

    // Try to find user by email or username
    let userEmail = loginIdentifier;
    
    // Check if identifier is username
    if (!loginIdentifier.includes('@')) {
      const usernameQuery = await db.collection(collections.accounts)
        .where('username', '==', loginIdentifier)
        .limit(1)
        .get();
      
      if (usernameQuery.empty) {
        return res.status(401).json({ error: 'invalid credentials' });
      }
      
      userEmail = usernameQuery.docs[0].data().email;
    }

    // Verify password with Firebase Auth
    // Note: Firebase doesn't have a direct password verification API
    // We need to use the client SDK or implement a workaround
    // For now, return error and client should handle auth
    return res.status(400).json({ 
      error: 'Please use Firebase client SDK for authentication',
      useFirebaseAuth: true 
    });

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

// Get current user profile
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const accountDoc = await db.collection(collections.accounts).doc(req.user.accountId).get();
    
    if (!accountDoc.exists) {
      return res.status(404).json({ error: 'account not found' });
    }

    const account = { id: accountDoc.id, ...accountDoc.data() };
    res.json({ account: normalizeLoginResponse(account) });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authRequired, async (req, res, next) => {
  try {
    const { companyName, username } = req.body;
    const accountId = req.user.accountId;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    const accountRef = db.collection(collections.accounts).doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      return res.status(404).json({ error: 'account not found' });
    }

    const currentData = accountDoc.data();
    let nextCompanyName = companyName;

    // Recruiters and partners cannot change company name
    if (req.user.role === 'recruiter' || req.user.role === 'partner') {
      nextCompanyName = currentData.companyName;
    } else if (!companyName) {
      return res.status(400).json({ error: 'company name is required' });
    }

    // Check if username is taken
    const usernameQuery = await db.collection(collections.accounts)
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    if (!usernameQuery.empty && usernameQuery.docs[0].id !== accountId) {
      return res.status(409).json({ error: 'username already taken' });
    }

    // Update account
    await accountRef.update({
      companyName: nextCompanyName,
      username: username.toLowerCase(),
      updatedAt: new Date(),
    });

    // Update Firebase Auth display name
    await auth.updateUser(accountId, {
      displayName: username,
    });

    const updated = await accountRef.get();
    res.json({ account: { id: accountId, ...updated.data(), role: req.user.role, parentAccountId: req.user.parentAccountId } });
  } catch (error) {
    next(error);
  }
});

// Get pending approvals (super admin only)
router.get('/pending-approvals', authRequired, async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'admin' && !req.user.parentAccountId;

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admin can view pending approvals' });
    }

    // Get pending admin accounts
    const pendingQuery = await db.collection(collections.accounts)
      .where('isApproved', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    const pending = pendingQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ pending });
  } catch (error) {
    next(error);
  }
});

// Approve account (super admin only)
router.post('/approve-account', authRequired, async (req, res, next) => {
  try {
    const { accountId } = req.body;
    const isSuperAdmin = req.user.role === 'admin' && !req.user.parentAccountId;

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admin can approve accounts' });
    }

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    const accountRef = db.collection(collections.accounts).doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      return res.status(404).json({ error: 'account not found' });
    }

    // Update approval status
    await accountRef.update({
      isApproved: true,
      updatedAt: new Date(),
    });

    // Update custom claims
    const accountData = accountDoc.data();
    await auth.setCustomUserClaims(accountId, {
      role: accountData.role,
      isApproved: true,
      parentAccountId: accountData.parentAccountId,
    });

    // Send approval notification email
    Promise.resolve()
      .then(() => sendApprovedEmail(accountData.email, accountData.username))
      .catch((emailError) => {
        console.error('Failed to send approval email:', emailError.message);
      });

    res.json({ message: 'Account approved successfully' });
  } catch (error) {
    next(error);
  }
});

// Create recruiter/partner (admin only)
router.post('/recruiters', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create team members' });
    }

    const { email, username, password, role = 'recruiter' } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    if (!['recruiter', 'partner'].includes(role)) {
      return res.status(400).json({ error: 'role must be recruiter or partner' });
    }

    // Check username availability
    const usernameQuery = await db.collection(collections.accounts)
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    
    if (!usernameQuery.empty) {
      return res.status(409).json({ error: 'username already exists' });
    }

    // Get admin's company name
    const adminDoc = await db.collection(collections.accounts).doc(req.user.accountId).get();
    const companyName = adminDoc.data().companyName;

    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email.toLowerCase(),
        password,
        displayName: username,
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'email already exists' });
      }
      throw authError;
    }

    // Create account document
    const accountData = {
      companyName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      role,
      isApproved: false, // Requires approval
      parentAccountId: req.user.tenantAccountId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(collections.accounts).doc(userRecord.uid).set(accountData);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      isApproved: false,
      parentAccountId: req.user.tenantAccountId,
    });

    res.status(201).json({
      message: `${role} created successfully. Awaiting super admin approval.`,
      account: { id: userRecord.uid, ...accountData },
    });
  } catch (error) {
    console.error('Create recruiter error:', error);
    next(error);
  }
});

// List recruiters/team members
router.get('/recruiters', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view team members' });
    }

    const recruitersQuery = await db.collection(collections.accounts)
      .where('parentAccountId', '==', req.user.tenantAccountId)
      .where('role', '==', 'recruiter')
      .orderBy('createdAt', 'desc')
      .get();

    const recruiters = recruitersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ recruiters });
  } catch (error) {
    next(error);
  }
});

// List partners
router.get('/partners', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view partners' });
    }

    const partnersQuery = await db.collection(collections.accounts)
      .where('parentAccountId', '==', req.user.tenantAccountId)
      .where('role', '==', 'partner')
      .orderBy('createdAt', 'desc')
      .get();

    const partners = partnersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ partners });
  } catch (error) {
    next(error);
  }
});

export default router;
