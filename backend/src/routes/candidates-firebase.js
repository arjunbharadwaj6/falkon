import express from 'express';
import { db, collections } from '../firebase.js';
import { authRequired } from '../middleware/auth-firebase.js';
import { formatDatesInObject } from '../utils/dateFormatter.js';

const router = express.Router();

const allowedProfileStatuses = ['submitted', 'selected', 'screening', 'interview', 'offered', 'hired', 'rejected', 'on-hold'];

// Protect all candidate routes
router.use(authRequired);

const isAdmin = (req) => req.user.role === 'admin';
const tenantAccountId = (req) => req.user.tenantAccountId;

// Create candidate
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, location, visaStatus, experience, profileStatus = 'submitted', linkedinUrl, resumeUrl, jobId, jobPositionId } = req.body;
    const accountId = tenantAccountId(req);
    const createdBy = req.user.accountId;
    const isAdminUser = isAdmin(req);

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Force profileStatus to 'submitted' for non-admin users
    let finalProfileStatus = isAdminUser ? profileStatus : 'submitted';

    if (!allowedProfileStatuses.includes(finalProfileStatus)) {
      return res.status(400).json({ error: `profileStatus must be one of: ${allowedProfileStatuses.join(', ')}` });
    }

    if (experience !== undefined) {
      const expNum = Number(experience);
      if (Number.isNaN(expNum) || expNum < 0) {
        return res.status(400).json({ error: 'experience must be a non-negative number' });
      }
    }

    // Get creator info
    const creatorDoc = await db.collection(collections.accounts).doc(createdBy).get();
    const creatorData = creatorDoc.exists ? creatorDoc.data() : {};

    const candidateData = {
      name,
      email: email || null,
      phone: phone || null,
      location: location || null,
      visaStatus: visaStatus || null,
      experience: experience ?? null,
      profileStatus: finalProfileStatus,
      linkedinUrl: linkedinUrl || null,
      resumeUrl: resumeUrl || null,
      jobId: jobId || null,
      jobPositionId: jobPositionId || null,
      accountId,
      createdBy,
      createdByUsername: creatorData.username || null,
      createdByEmail: creatorData.email || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(collections.candidates).add(candidateData);
    
    res.status(201).json({ 
      candidate: { 
        id: docRef.id, 
        ...candidateData 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Update candidate
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountId = tenantAccountId(req);
    const isAdminUser = isAdmin(req);
    const onlySelf = !isAdminUser;
    const { name, email, phone, location, visaStatus, experience, profileStatus, linkedinUrl, resumeUrl, jobId, jobPositionId } = req.body;

    // Get candidate document
    const candidateRef = db.collection(collections.candidates).doc(id);
    const candidateDoc = await candidateRef.get();

    if (!candidateDoc.exists) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    const candidateData = candidateDoc.data();

    // Check permissions
    if (candidateData.accountId !== accountId) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    if (onlySelf && candidateData.createdBy !== req.user.accountId) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (visaStatus !== undefined) updates.visaStatus = visaStatus;
    
    if (experience !== undefined) {
      const expNum = Number(experience);
      if (Number.isNaN(expNum) || expNum < 0) {
        return res.status(400).json({ error: 'experience must be a non-negative number' });
      }
      updates.experience = expNum;
    }

    if (profileStatus !== undefined) {
      // Force profileStatus to 'submitted' for non-admin users, even on updates
      const finalStatus = isAdminUser ? profileStatus : 'submitted';
      if (!allowedProfileStatuses.includes(finalStatus)) {
        return res.status(400).json({ error: `profileStatus must be one of: ${allowedProfileStatuses.join(', ')}` });
      }
      updates.profileStatus = finalStatus;
    }

    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
    if (resumeUrl !== undefined) updates.resumeUrl = resumeUrl;
    if (jobId !== undefined) updates.jobId = jobId || null;
    if (jobPositionId !== undefined) updates.jobPositionId = jobPositionId || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    updates.updatedAt = new Date();

    await candidateRef.update(updates);

    const updated = await candidateRef.get();
    res.json({ candidate: { id: updated.id, ...updated.data() } });
  } catch (error) {
    next(error);
  }
});

// Get all candidates
router.get('/', async (req, res, next) => {
  try {
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);

    let query = db.collection(collections.candidates)
      .where('accountId', '==', accountId);

    if (onlySelf) {
      query = query.where('createdBy', '==', req.user.accountId);
    }

    const snapshot = await query.get();

    const candidates = snapshot.docs
      .sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || (typeof a.data().createdAt === 'number' ? a.data().createdAt : 0);
        const timeB = b.data().createdAt?.toMillis?.() || (typeof b.data().createdAt === 'number' ? b.data().createdAt : 0);
        return timeB - timeA;
      })
      .map(doc => formatDatesInObject({
        id: doc.id,
        ...doc.data(),
      }));

    res.json({ candidates });
  } catch (error) {
    next(error);
  }
});

// Delete candidate
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);

    const candidateRef = db.collection(collections.candidates).doc(id);
    const candidateDoc = await candidateRef.get();

    if (!candidateDoc.exists) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    const candidateData = candidateDoc.data();

    if (candidateData.accountId !== accountId) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    if (onlySelf && candidateData.createdBy !== req.user.accountId) {
      return res.status(403).json({ error: 'You can only delete your own candidates' });
    }

    await candidateRef.delete();

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Stats for dashboard
router.get('/stats/summary', async (req, res, next) => {
  try {
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);

    let query = db.collection(collections.candidates)
      .where('accountId', '==', accountId);

    if (onlySelf) {
      query = query.where('createdBy', '==', req.user.accountId);
    }

    const snapshot = await query.get();
    const candidates = snapshot.docs.map(doc => doc.data());

    const total = candidates.length;
    const hired = candidates.filter(c => c.profileStatus === 'hired').length;
    const rejected = candidates.filter(c => c.profileStatus === 'rejected').length;
    const active = candidates.filter(c => !['hired', 'rejected'].includes(c.profileStatus)).length;

    res.json({
      summary: {
        total,
        hired,
        rejected,
        active,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Analytics and insights
router.get('/analytics/insights', async (req, res, next) => {
  try {
    const accountId = tenantAccountId(req);

    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Only admins can view analytics' });
    }

    const snapshot = await db.collection(collections.candidates)
      .where('accountId', '==', accountId)
      .get();

    const candidates = snapshot.docs.map(doc => doc.data());

    const total = candidates.length;
    const hired = candidates.filter(c => c.profileStatus === 'hired').length;
    const rejected = candidates.filter(c => c.profileStatus === 'rejected').length;
    const acceptanceRate = total > 0 ? Math.round((hired / total) * 100) : 0;

    // Recruiter stats
    const recruiterMap = {};
    candidates.forEach(c => {
      const key = c.createdBy;
      if (!recruiterMap[key]) {
        recruiterMap[key] = {
          username: c.createdByUsername || 'Unknown',
          email: c.createdByEmail || '',
          candidatesAdded: 0,
          hired: 0,
        };
      }
      recruiterMap[key].candidatesAdded++;
      if (c.profileStatus === 'hired') {
        recruiterMap[key].hired++;
      }
    });

    const recruiterStats = Object.values(recruiterMap).map(r => ({
      ...r,
      acceptanceRate: r.candidatesAdded > 0 ? Math.round((r.hired / r.candidatesAdded) * 100) : 0,
    })).sort((a, b) => b.candidatesAdded - a.candidatesAdded);

    // Status distribution
    const statusMap = {};
    candidates.forEach(c => {
      statusMap[c.profileStatus] = (statusMap[c.profileStatus] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // Visa distribution
    const visaMap = {};
    candidates.forEach(c => {
      const visa = c.visaStatus || 'Unknown';
      visaMap[visa] = (visaMap[visa] || 0) + 1;
    });
    const visaDistribution = Object.entries(visaMap).map(([visaStatus, count]) => ({ visaStatus, count }));

    // Job position stats
    const jobPositionMap = {};
    candidates.forEach(c => {
      if (c.jobPositionId) {
        if (!jobPositionMap[c.jobPositionId]) {
          jobPositionMap[c.jobPositionId] = { position: c.jobPositionId, count: 0, hired: 0 };
        }
        jobPositionMap[c.jobPositionId].count++;
        if (c.profileStatus === 'hired') {
          jobPositionMap[c.jobPositionId].hired++;
        }
      }
    });
    const jobPositionStats = Object.values(jobPositionMap);

    res.json({
      summary: { total, hired, rejected, acceptanceRate },
      recruiterStats,
      statusDistribution,
      visaDistribution,
      jobPositionStats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
