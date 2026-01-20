import express from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

const WORK_TYPES = ['hybrid', 'remote', 'onsite'];
const STATUSES = ['active', 'onhold', 'closed'];

const generateJobCode = () => `JOB-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

router.post('/jobs', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create jobs' });
    }

    const {
      jobCode,
      title,
      description,
      descriptionPdfUrl,
      clientName,
      location,
      workType,
      visaType,
      positions,
      status,
      jobPositionId,
    } = req.body;

    if (!title || !workType || !status) {
      return res.status(400).json({ error: 'title, workType, and status are required' });
    }

    const normalizedWorkType = String(workType).toLowerCase();
    const normalizedStatus = String(status).toLowerCase();

    if (!WORK_TYPES.includes(normalizedWorkType)) {
      return res.status(400).json({ error: `workType must be one of: ${WORK_TYPES.join(', ')}` });
    }

    if (!STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }

    const positionsNumber = Number.isInteger(Number(positions)) ? Number(positions) : 1;
    if (!Number.isInteger(positionsNumber) || positionsNumber <= 0) {
      return res.status(400).json({ error: 'positions must be a positive integer' });
    }

    const code = (jobCode || generateJobCode()).trim();

    const insert = await query(
      `INSERT INTO jobs (
        job_code, title, description, description_pdf_url, client_name, location,
        work_type, visa_type, positions, status, job_position_id, owner_account_id, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id, job_code AS "jobCode", title, description, description_pdf_url AS "descriptionPdfUrl",
                client_name AS "clientName", location, work_type AS "workType", visa_type AS "visaType",
                positions, status, job_position_id AS "jobPositionId", created_at AS "createdAt"`,
      [
        code,
        title.trim(),
        description?.trim() || null,
        descriptionPdfUrl || null,
        clientName?.trim() || null,
        location?.trim() || null,
        normalizedWorkType,
        visaType?.trim() || null,
        positionsNumber,
        normalizedStatus,
        jobPositionId || null,
        req.user.accountId,
        req.user.accountId,
      ]
    );

    res.status(201).json({ job: insert.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'jobCode must be unique' });
    }
    next(error);
  }
});

router.get('/jobs', authRequired, async (req, res, next) => {
  try {
    const ownerAccountId = req.user.role === 'admin' ? req.user.accountId : req.user.parentAccountId;

    if (!ownerAccountId) {
      return res.status(403).json({ error: 'No parent account found for recruiter' });
    }

    const { rows } = await query(
      `SELECT j.id, j.job_code AS "jobCode", j.title, j.description, j.description_pdf_url AS "descriptionPdfUrl",
              j.client_name AS "clientName", j.location, j.work_type AS "workType", j.visa_type AS "visaType",
              j.positions, j.status, j.job_position_id AS "jobPositionId", j.created_at AS "createdAt",
              jp.name AS "jobPositionName"
       FROM jobs j
       LEFT JOIN job_positions jp ON j.job_position_id = jp.id
       WHERE j.owner_account_id = $1
       ORDER BY j.created_at DESC`,
      [ownerAccountId]
    );

    res.json({ jobs: rows });
  } catch (error) {
    next(error);
  }
});

router.put('/jobs/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update jobs' });
    }

    const { id } = req.params;
    const { positions } = req.body;

    if (positions === undefined) {
      return res.status(400).json({ error: 'positions is required' });
    }

    const positionsNumber = Number(positions);
    if (!Number.isInteger(positionsNumber) || positionsNumber <= 0) {
      return res.status(400).json({ error: 'positions must be a positive integer' });
    }

    const ownerAccountId = req.user.accountId;

    const update = await query(
      `UPDATE jobs
       SET positions = $1
       WHERE id = $2 AND owner_account_id = $3
       RETURNING id, job_code AS "jobCode", title, description, description_pdf_url AS "descriptionPdfUrl",
                 client_name AS "clientName", location, work_type AS "workType", visa_type AS "visaType",
                 positions, status, created_at AS "createdAt"`,
      [positionsNumber, id, ownerAccountId]
    );

    if (update.rowCount === 0) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    res.json({ job: update.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
