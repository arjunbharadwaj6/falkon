import express from 'express';
import { randomUUID } from 'crypto';
import { db, collections } from '../firebase.js';
import { authRequired } from '../middleware/auth-firebase.js';
import { formatDatesInObject } from '../utils/dateFormatter.js';

const router = express.Router();

const WORK_TYPES = ['hybrid', 'remote', 'onsite'];
const STATUSES = ['active', 'onhold', 'closed'];

const generateJobCode = () => `JOB-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

// Create job
router.post('/', authRequired, async (req, res, next) => {
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

    // Check if job code already exists
    const existingJob = await db.collection(collections.jobs)
      .where('jobCode', '==', code)
      .where('ownerAccountId', '==', req.user.accountId)
      .limit(1)
      .get();

    if (!existingJob.empty) {
      return res.status(409).json({ error: 'jobCode must be unique' });
    }

    const jobData = {
      jobCode: code,
      title: title.trim(),
      description: description?.trim() || null,
      descriptionPdfUrl: descriptionPdfUrl || null,
      clientName: clientName?.trim() || null,
      location: location?.trim() || null,
      workType: normalizedWorkType,
      visaType: visaType?.trim() || null,
      positions: positionsNumber,
      status: normalizedStatus,
      jobPositionId: jobPositionId || null,
      ownerAccountId: req.user.accountId,
      createdBy: req.user.accountId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(collections.jobs).add(jobData);

    res.status(201).json({ job: { id: docRef.id, ...jobData } });
  } catch (error) {
    next(error);
  }
});

// Get all jobs
router.get('/', authRequired, async (req, res, next) => {
  try {
    const ownerAccountId = req.user.role === 'admin' ? req.user.accountId : req.user.parentAccountId;

    if (!ownerAccountId) {
      return res.status(403).json({ error: 'No parent account found for recruiter' });
    }

    const snapshot = await db.collection(collections.jobs)
      .where('ownerAccountId', '==', ownerAccountId)
      .get();

    const sortedDocs = snapshot.docs.sort((a, b) => {
      const timeA = a.data().createdAt?.toMillis?.() || (typeof a.data().createdAt === 'number' ? a.data().createdAt : 0);
      const timeB = b.data().createdAt?.toMillis?.() || (typeof b.data().createdAt === 'number' ? b.data().createdAt : 0);
      return timeB - timeA;
    });

    const jobs = await Promise.all(sortedDocs.map(async (doc) => {
      const jobData = doc.data();
      let jobPositionName = null;

      // Get job position name if exists
      if (jobData.jobPositionId) {
        const positionDoc = await db.collection(collections.jobPositions).doc(jobData.jobPositionId).get();
        if (positionDoc.exists) {
          jobPositionName = positionDoc.data().name;
        }
      }

      return formatDatesInObject({
        id: doc.id,
        ...jobData,
        jobPositionName,
      });
    }));

    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

// Update job
router.put('/:id', authRequired, async (req, res, next) => {
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

    const jobRef = db.collection(collections.jobs).doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();

    if (jobData.ownerAccountId !== req.user.accountId) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    await jobRef.update({
      positions: positionsNumber,
      updatedAt: new Date(),
    });

    const updated = await jobRef.get();
    res.json({ job: { id: updated.id, ...updated.data() } });
  } catch (error) {
    next(error);
  }
});

// Delete job
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete jobs' });
    }

    const { id } = req.params;

    const jobRef = db.collection(collections.jobs).doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = jobDoc.data();

    if (jobData.ownerAccountId !== req.user.accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await jobRef.delete();

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
