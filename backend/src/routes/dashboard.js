import express from 'express';
import { db, collections } from '../firebase.js';
import { authRequired } from '../middleware/auth-firebase.js';

const router = express.Router();

router.get('/dashboard/stats', authRequired, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const ownerAccountId = isAdmin ? req.user.accountId : req.user.parentAccountId || req.user.accountId;

    // Get jobs
    const jobsSnapshot = await db.collection(collections.jobs)
      .where('ownerAccountId', '==', ownerAccountId)
      .get();
    
    const jobs = jobsSnapshot.docs.map(doc => doc.data());
    const jobStats = {
      total: jobs.length,
      active: jobs.filter(j => j.status === 'active').length,
      onhold: jobs.filter(j => j.status === 'onhold').length,
      closed: jobs.filter(j => j.status === 'closed').length,
    };

    // Get candidates
    const candidatesSnapshot = await db.collection(collections.candidates)
      .where('accountId', '==', ownerAccountId)
      .get();
    
    const candidates = candidatesSnapshot.docs.map(doc => doc.data());
    const candidateStats = {
      total: candidates.length,
      new: candidates.filter(c => c.profileStatus === 'new').length,
      screening: candidates.filter(c => c.profileStatus === 'screening').length,
      interview: candidates.filter(c => c.profileStatus === 'interview').length,
      offer: candidates.filter(c => c.profileStatus === 'offer').length,
      hired: candidates.filter(c => c.profileStatus === 'hired').length,
      rejected: candidates.filter(c => c.profileStatus === 'rejected').length,
    };

    // Get recent candidates
    const recentCandidatesSnapshot = await db.collection(collections.candidates)
      .where('accountId', '==', ownerAccountId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const recentCandidates = recentCandidatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.name,
        profile_status: data.profileStatus,
        created_at: data.createdAt,
        created_by_name: data.createdByUsername,
      };
    });

    // Get recent jobs
    const recentJobsSnapshot = await db.collection(collections.jobs)
      .where('ownerAccountId', '==', ownerAccountId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const recentJobs = recentJobsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        title: data.title,
        status: data.status,
        created_at: data.createdAt,
        created_by_name: 'Admin',
      };
    });

    // Get recruiter count
    let recruiterCount = 0;
    if (isAdmin) {
      const recruitersSnapshot = await db.collection(collections.accounts)
        .where('parentAccountId', '==', req.user.accountId)
        .where('role', '==', 'recruiter')
        .get();
      recruiterCount = recruitersSnapshot.size;
    }

    const stats = {
      jobs: {
        total: jobStats.total,
        active: jobStats.active,
        onhold: jobStats.onhold,
        closed: jobStats.closed,
      },
      candidates: {
        total: candidateStats.total,
        new: candidateStats.new,
        screening: candidateStats.screening,
        interview: candidateStats.interview,
        offer: candidateStats.offer,
        hired: candidateStats.hired,
        rejected: candidateStats.rejected,
      },
      recruiters: recruiterCount,
      recentActivity: [
        ...recentJobs.map(job => ({
          type: 'job',
          title: job.title,
          status: job.status,
          createdAt: job.created_at,
          createdBy: job.created_by_name,
        })),
        ...recentCandidates.map(candidate => ({
          type: 'candidate',
          title: candidate.name,
          status: candidate.profile_status,
          createdAt: candidate.created_at,
          createdBy: candidate.created_by_name,
        })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
});

export default router;
