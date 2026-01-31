import express from 'express';
import { db } from '../firebase.js';

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 * Returns server status and database connectivity
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    database: 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check Firestore connectivity
    const testRef = db.collection('_health_check').limit(1);
    await testRef.get();
    
    healthCheck.database = 'connected';
    healthCheck.databaseType = 'Firebase Firestore';
    healthCheck.projectId = 'falkon-b7c5f';

    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.database = 'disconnected';
    healthCheck.error = error.message;
    
    console.error('Health check failed:', error);
    res.status(503).json(healthCheck);
  }
});

export default router;
