import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /job-positions - Retrieve all job positions for the current admin
 * Requires: Authentication
 * Returns: Array of job positions ordered by name
 */
router.get('/job-positions', authRequired, async (req, res, next) => {
  try {
    const accountId = req.user.parentAccountId || req.user.accountId;
    
    const { rows } = await query(
      `SELECT id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM job_positions
       WHERE owner_account_id = $1
       ORDER BY name ASC`,
      [accountId]
    );

    res.json({ positions: rows });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /job-positions - Create a new job position
 * Requires: Authentication + Admin role
 * Body: { name, description? }
 * Returns: Created position object or error
 */
router.post('/job-positions', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create job positions' });
    }

    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Position name is required' });
    }

    // Check if position name already exists for this admin
    const existing = await query(
      'SELECT id FROM job_positions WHERE name = $1 AND owner_account_id = $2',
      [name.trim(), req.user.accountId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A position with this name already exists' });
    }

    const insert = await query(
      `INSERT INTO job_positions (name, description, owner_account_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [name.trim(), description?.trim() || null, req.user.accountId, req.user.accountId]
    );

    res.status(201).json({ position: insert.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /job-positions/:id - Update a job position
 * Requires: Authentication + Admin role
 * Body: { name, description? }
 * Returns: Updated position object or error
 */
router.put('/job-positions/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update job positions' });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Position name is required' });
    }

    // Verify position belongs to this admin
    const existing = await query(
      'SELECT id FROM job_positions WHERE id = $1 AND owner_account_id = $2',
      [id, req.user.accountId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Job position not found' });
    }

    // Check if new name conflicts with another position
    const conflict = await query(
      'SELECT id FROM job_positions WHERE name = $1 AND owner_account_id = $2 AND id != $3',
      [name.trim(), req.user.accountId, id]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'A position with this name already exists' });
    }

    const update = await query(
      `UPDATE job_positions
       SET name = $1, description = $2
       WHERE id = $3 AND owner_account_id = $4
       RETURNING id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [name.trim(), description?.trim() || null, id, req.user.accountId]
    );

    res.json({ position: update.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /job-positions/:id - Delete a job position
 * Requires: Authentication + Admin role
 * Returns: Success message or error if position is in use
 */
router.delete('/job-positions/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete job positions' });
    }

    const { id } = req.params;

    // Check if position is being used by any jobs
    const jobsUsing = await query(
      'SELECT COUNT(*) as count FROM jobs WHERE job_position_id = $1',
      [id]
    );

    if (jobsUsing.rows[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete position. It is currently assigned to ${jobsUsing.rows[0].count} job(s)` 
      });
    }

    const result = await query(
      'DELETE FROM job_positions WHERE id = $1 AND owner_account_id = $2 RETURNING id',
      [id, req.user.accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job position not found' });
    }

    res.json({ message: 'Job position deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
