import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

const allowedProfileStatuses = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'on-hold'];

// Protect all candidate routes
router.use(authRequired);

const isAdmin = (req) => req.user.role === 'admin';
const tenantAccountId = (req) => req.user.tenantAccountId;

router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, location, visaStatus, experience, profileStatus = 'new', linkedinUrl, resumeUrl, jobId, jobPositionId } = req.body;
    const accountId = tenantAccountId(req);
    const createdBy = req.user.accountId;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!allowedProfileStatuses.includes(profileStatus)) {
      return res.status(400).json({ error: `profileStatus must be one of: ${allowedProfileStatuses.join(', ')}` });
    }

    if (experience !== undefined) {
      const expNum = Number(experience);
      if (Number.isNaN(expNum) || expNum < 0) {
        return res.status(400).json({ error: 'experience must be a non-negative number' });
      }
    }

    const insertQuery = `
      INSERT INTO candidates (name, email, phone, location, visa_status, experience_years, profile_status, linkedin_url, resume_url, job_id, job_position_id, account_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id,
        name,
        email,
        phone,
        location,
        visa_status AS "visaStatus",
        experience_years AS experience,
        profile_status AS "profileStatus",
        linkedin_url AS "linkedinUrl",
        resume_url AS "resumeUrl",
        job_id AS "jobId",
        job_position_id AS "jobPositionId",
        account_id AS "accountId",
        created_by AS "createdBy",
        (SELECT username FROM accounts WHERE id = created_by) AS "createdByUsername",
        (SELECT email FROM accounts WHERE id = created_by) AS "createdByEmail",
        created_at,
        updated_at;
    `;

    const values = [name, email || null, phone || null, location || null, visaStatus || null, experience ?? null, profileStatus, linkedinUrl || null, resumeUrl || null, jobId || null, jobPositionId || null, accountId, createdBy];
    const { rows } = await query(insertQuery, values);

    res.status(201).json({ candidate: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);
    const { name, email, phone, location, visaStatus, experience, profileStatus, linkedinUrl, resumeUrl, jobId, jobPositionId } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }

    if (email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }

    if (location !== undefined) {
      updates.push(`location = $${idx++}`);
      values.push(location);
    }

    if (visaStatus !== undefined) {
      updates.push(`visa_status = $${idx++}`);
      values.push(visaStatus);
    }

    if (experience !== undefined) {
      const expNum = Number(experience);
      if (Number.isNaN(expNum) || expNum < 0) {
        return res.status(400).json({ error: 'experience must be a non-negative number' });
      }
      updates.push(`experience_years = $${idx++}`);
      values.push(expNum);
    }

    if (profileStatus !== undefined) {
      if (!allowedProfileStatuses.includes(profileStatus)) {
        return res.status(400).json({ error: `profileStatus must be one of: ${allowedProfileStatuses.join(', ')}` });
      }
      updates.push(`profile_status = $${idx++}`);
      values.push(profileStatus);
    }

    if (linkedinUrl !== undefined) {
      updates.push(`linkedin_url = $${idx++}`);
      values.push(linkedinUrl);
    }

    if (resumeUrl !== undefined) {
      updates.push(`resume_url = $${idx++}`);
      values.push(resumeUrl);
    }

    if (jobId !== undefined) {
      updates.push(`job_id = $${idx++}`);
      values.push(jobId || null);
    }

    if (jobPositionId !== undefined) {
      updates.push(`job_position_id = $${idx++}`);
      values.push(jobPositionId || null);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);

    const updateQuery = `
      UPDATE candidates
      SET ${updates.join(', ')}
      WHERE id = $${idx} AND account_id = $${idx + 1}${onlySelf ? ` AND created_by = $${idx + 2}` : ''}
      RETURNING id, name, email, phone, location, visa_status AS "visaStatus", experience_years AS experience, profile_status AS "profileStatus", linkedin_url AS "linkedinUrl", resume_url AS "resumeUrl", job_id AS "jobId", job_position_id AS "jobPositionId", account_id AS "accountId", created_by AS "createdBy", created_at, updated_at;
    `;

    const queryParams = onlySelf ? [...values, accountId, req.user.accountId] : [...values, accountId];
    const { rows } = await query(updateQuery, queryParams);

    if (!rows.length) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    res.json({ candidate: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);
    const listQuery = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.location,
        c.visa_status AS "visaStatus",
        c.experience_years AS experience,
        c.profile_status AS "profileStatus",
        c.linkedin_url AS "linkedinUrl",
        c.resume_url AS "resumeUrl",
        c.job_id AS "jobId",
        c.job_position_id AS "jobPositionId",
        c.account_id AS "accountId",
        c.created_by AS "createdBy",
        cb.username AS "createdByUsername",
        cb.email AS "createdByEmail",
        c.created_at,
        c.updated_at
      FROM candidates c
      LEFT JOIN accounts cb ON cb.id = c.created_by
      WHERE c.account_id = $1 ${onlySelf ? 'AND c.created_by = $2' : ''}
      ORDER BY c.created_at DESC;
    `;
    const params = onlySelf ? [accountId, req.user.accountId] : [accountId];
    const { rows } = await query(listQuery, params);
    res.json({ candidates: rows });
  } catch (error) {
    next(error);
  }
});

// Stats for dashboard (role-aware)
router.get('/stats/summary', async (req, res, next) => {
  try {
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);

    const filters = ['account_id = $1'];
    const params = [accountId];

    if (onlySelf) {
      filters.push('created_by = $2');
      params.push(req.user.accountId);
    }

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE profile_status = 'hired')::int AS accepted,
        COUNT(*) FILTER (WHERE profile_status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE profile_status NOT IN ('hired','rejected'))::int AS pending
      FROM candidates
      WHERE ${filters.join(' AND ')};
    `;

    const { rows } = await query(statsQuery, params);
    res.json({ stats: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);
    const detailQuery = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.location,
        c.visa_status AS "visaStatus",
        c.experience_years AS experience,
        c.profile_status AS "profileStatus",
        c.linkedin_url AS "linkedinUrl",
        c.resume_url AS "resumeUrl",
        c.job_id AS "jobId",
        c.job_position_id AS "jobPositionId",
        c.account_id AS "accountId",
        c.created_by AS "createdBy",
        cb.username AS "createdByUsername",
        cb.email AS "createdByEmail",
        c.created_at,
        c.updated_at
      FROM candidates c
      LEFT JOIN accounts cb ON cb.id = c.created_by
      WHERE c.id = $1 AND c.account_id = $2 ${onlySelf ? 'AND c.created_by = $3' : ''};
    `;
    const params = onlySelf ? [id, accountId, req.user.accountId] : [id, accountId];
    const { rows } = await query(detailQuery, params);

    if (!rows.length) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    res.json({ candidate: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);

    const deleteQuery = `DELETE FROM candidates WHERE id = $1 AND account_id = $2${onlySelf ? ' AND created_by = $3' : ''} RETURNING id;`;
    const params = onlySelf ? [id, accountId, req.user.accountId] : [id, accountId];
    const { rows } = await query(deleteQuery, params);

    if (!rows.length) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// Stats for dashboard (role-aware)
router.get('/stats/summary', async (req, res, next) => {
  try {
    const accountId = tenantAccountId(req);
    const onlySelf = !isAdmin(req);

    const filters = ['account_id = $1'];
    const params = [accountId];

    if (onlySelf) {
      filters.push('created_by = $2');
      params.push(req.user.accountId);
    }

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE profile_status = 'hired')::int AS accepted,
        COUNT(*) FILTER (WHERE profile_status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE profile_status NOT IN ('hired','rejected'))::int AS pending
      FROM candidates
      WHERE ${filters.join(' AND ')};
    `;

    const { rows } = await query(statsQuery, params);
    res.json({ stats: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
