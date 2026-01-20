import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard/stats', authRequired, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const accountId = req.user.accountId;
    
    // Get the owner account ID (for both admin and recruiter)
    const ownerAccountId = isAdmin ? accountId : req.user.parentAccountId || accountId;

    // Get total jobs
    const jobsResult = await query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'active') as active,
              COUNT(*) FILTER (WHERE status = 'onhold') as onhold,
              COUNT(*) FILTER (WHERE status = 'closed') as closed
       FROM jobs 
       WHERE owner_account_id = $1`,
      [ownerAccountId]
    );

    // Get candidate statistics
    const candidatesResult = await query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE profile_status = 'new') as new,
              COUNT(*) FILTER (WHERE profile_status = 'screening') as screening,
              COUNT(*) FILTER (WHERE profile_status = 'interview') as interview,
              COUNT(*) FILTER (WHERE profile_status = 'offer') as offer,
              COUNT(*) FILTER (WHERE profile_status = 'hired') as hired,
              COUNT(*) FILTER (WHERE profile_status = 'rejected') as rejected
       FROM candidates 
       WHERE account_id = $1`,
      [ownerAccountId]
    );

    // Get recent activities (last 10 candidates and jobs)
    const recentCandidates = await query(
      `SELECT c.name, c.profile_status, c.created_at, a.username as created_by_name
       FROM candidates c
       LEFT JOIN accounts a ON c.created_by = a.id
       WHERE c.account_id = $1
       ORDER BY c.created_at DESC
       LIMIT 5`,
      [ownerAccountId]
    );

    const recentJobs = await query(
      `SELECT j.title, j.status, j.created_at, a.username as created_by_name
       FROM jobs j
       LEFT JOIN accounts a ON j.created_by = a.id
       WHERE j.owner_account_id = $1
       ORDER BY j.created_at DESC
       LIMIT 5`,
      [ownerAccountId]
    );

    // Get recruiter count (only for admins)
    let recruiterCount = 0;
    if (isAdmin) {
      const recruitersResult = await query(
        `SELECT COUNT(*) as count
         FROM accounts
         WHERE parent_account_id = $1 AND role = 'recruiter'`,
        [accountId]
      );
      recruiterCount = parseInt(recruitersResult.rows[0].count);
    }

    const stats = {
      jobs: {
        total: parseInt(jobsResult.rows[0].total),
        active: parseInt(jobsResult.rows[0].active),
        onhold: parseInt(jobsResult.rows[0].onhold),
        closed: parseInt(jobsResult.rows[0].closed),
      },
      candidates: {
        total: parseInt(candidatesResult.rows[0].total),
        new: parseInt(candidatesResult.rows[0].new),
        screening: parseInt(candidatesResult.rows[0].screening),
        interview: parseInt(candidatesResult.rows[0].interview),
        offer: parseInt(candidatesResult.rows[0].offer),
        hired: parseInt(candidatesResult.rows[0].hired),
        rejected: parseInt(candidatesResult.rows[0].rejected),
      },
      recruiters: recruiterCount,
      recentActivity: [
        ...recentJobs.rows.map(job => ({
          type: 'job',
          title: job.title,
          status: job.status,
          createdAt: job.created_at,
          createdBy: job.created_by_name,
        })),
        ...recentCandidates.rows.map(candidate => ({
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
