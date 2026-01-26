import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection, ensureSchema, closePool } from './db.js';
import { verifyEmailTransporter } from './services/email.js';
import healthRouter from './routes/health.js';
import candidatesRouter from './routes/candidates.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import jobsRouter from './routes/jobs.js';
import jobPositionsRouter from './routes/jobPositions.js';
import dashboardRouter from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Middleware
// Secure headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: support comma-separated origins
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api', jobsRouter);
app.use('/api', jobPositionsRouter);
app.use('/api', uploadRouter);
app.use('/api', dashboardRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ATS Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      candidates: '/api/candidates',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    await closePool();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Test database connection before starting server
    const dbConnected = await testConnection();
    if (dbConnected) {
      await ensureSchema();
    }
    
    if (!dbConnected) {
      console.warn('⚠ Warning: Server starting without database connection');
    }

    // Verify email transporter
    await verifyEmailTransporter();

    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════');
      console.log(`🚀 ATS Backend Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('═══════════════════════════════════════════════');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
