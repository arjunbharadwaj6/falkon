import jwt from 'jsonwebtoken';

export const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const role = payload.role || 'admin';
    const parentAccountId = payload.parentAccountId || null;
    // Tenancy: admins operate on their own account; recruiters/partners inherit their admin's account
    const tenantAccountId = role === 'admin' ? payload.sub : (parentAccountId || payload.sub);

    req.user = {
      accountId: payload.sub,
      email: payload.email,
      role,
      parentAccountId,
      tenantAccountId,
    };
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const signToken = ({ accountId, email, role = 'admin', parentAccountId = null }) => {
  return jwt.sign(
    { sub: accountId, email, role, parentAccountId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};
