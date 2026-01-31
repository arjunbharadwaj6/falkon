import { auth } from '../firebase.js';

export const authRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user custom claims
    const userRecord = await auth.getUser(decodedToken.uid);
    const customClaims = userRecord.customClaims || {};
    
    const role = customClaims.role || 'admin';
    const parentAccountId = customClaims.parentAccountId || null;
    const tenantAccountId = role === 'admin' ? decodedToken.uid : (parentAccountId || decodedToken.uid);
    const isApproved = customClaims.isApproved !== false;

    req.user = {
      accountId: decodedToken.uid,
      email: decodedToken.email,
      role,
      parentAccountId,
      tenantAccountId,
      isApproved,
    };
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// No longer needed - Firebase handles token generation
export const signToken = ({ accountId, email, role = 'admin', parentAccountId = null }) => {
  throw new Error('signToken is deprecated. Use Firebase Auth to generate tokens.');
};
