import express from 'express';
import { query } from '../db.js';

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
    // Check database connectivity
    const result = await query('SELECT NOW() as time, version() as version');
    
    if (result.rows.length > 0) {
      healthCheck.database = 'connected';
      healthCheck.databaseTime = result.rows[0].time;
      healthCheck.databaseVersion = result.rows[0].version.split(',')[0];
    }

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
