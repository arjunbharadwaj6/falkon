import express from 'express';
import { db, collections } from '../firebase.js';
import { authRequired } from '../middleware/auth-firebase.js';

const router = express.Router();

// Create job position
router.post('/', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create job positions' });
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Check if position already exists for this account
    const existingPosition = await db.collection(collections.jobPositions)
      .where('ownerAccountId', '==', req.user.accountId)
      .where('name', '==', name.trim())
      .limit(1)
      .get();

    if (!existingPosition.empty) {
      return res.status(409).json({ error: 'A job position with this name already exists' });
    }

    const positionData = {
      name: name.trim(),
      ownerAccountId: req.user.accountId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(collections.jobPositions).add(positionData);

    res.status(201).json({ 
      jobPosition: { 
        id: docRef.id, 
        ...positionData 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Get all job positions
router.get('/', authRequired, async (req, res, next) => {
  try {
    const ownerAccountId = req.user.role === 'admin' ? req.user.accountId : req.user.parentAccountId;

    if (!ownerAccountId) {
      return res.status(403).json({ error: 'No parent account found' });
    }

    const snapshot = await db.collection(collections.jobPositions)
      .where('ownerAccountId', '==', ownerAccountId)
      .orderBy('createdAt', 'desc')
      .get();

    const jobPositions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ jobPositions });
  } catch (error) {
    next(error);
  }
});

// Delete job position
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete job positions' });
    }

    const { id } = req.params;

    const positionRef = db.collection(collections.jobPositions).doc(id);
    const positionDoc = await positionRef.get();

    if (!positionDoc.exists) {
      return res.status(404).json({ error: 'Job position not found' });
    }

    const positionData = positionDoc.data();

    if (positionData.ownerAccountId !== req.user.accountId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await positionRef.delete();

    res.json({ message: 'Job position deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
