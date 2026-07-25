require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const purchaseRequestRoutes = require('./routes/purchaseRequests');
const vendorRoutes = require('./routes/vendors');
const quoteRoutes = require('./routes/quotes');
const emailRoutes = require('./routes/email');
const activityLogRoutes = require('./routes/activityLogs');
const analyticsRoutes = require('./routes/analytics');
const attachmentRoutes = require('./routes/attachments');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const prisma = require('./lib/prisma');
const logger = require('./lib/logger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Disable ETags for API responses — these are dynamic, real-time endpoints
// ETags cause Express to return 304 (empty body) for polling requests
app.set('etag', false);

// Prevent any residual caching of API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/purchase-requests', generalLimiter, purchaseRequestRoutes);
app.use('/api/vendors', generalLimiter, vendorRoutes);
app.use('/api/purchase-requests', generalLimiter, quoteRoutes);
app.use('/api/email', generalLimiter, emailRoutes);
app.use('/api/activity-logs', generalLimiter, activityLogRoutes);
app.use('/api/analytics', generalLimiter, analyticsRoutes);
app.use('/api', generalLimiter, attachmentRoutes);
app.use('/api/chat', generalLimiter, chatRoutes);
app.use('/api/notifications', generalLimiter, notificationRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

// 404 handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('global', err, { url: req.originalUrl, method: req.method });
  res.status(err.status || 500).json({
    error: err.expose ? err.message : 'An unexpected error occurred. Please try again later.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`ProcureAI backend running on port ${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server shut down.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
