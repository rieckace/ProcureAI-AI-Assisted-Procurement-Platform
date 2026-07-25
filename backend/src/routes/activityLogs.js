const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../lib/logger');

// Helper to create activity log
async function logActivity(userId, action, entity, entityId, details, orgId) {
  try {
    const organizationId = orgId || (await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    }))?.organizationId;
    if (!organizationId) return;
    await prisma.activityLog.create({
      data: { userId, organizationId, action, entity, entityId, details },
    });
  } catch (err) {
    logger.error('activityLogs.create', err);
  }
}

// GET /api/activity-logs - Get all activity logs (admin only)
router.get('/', authenticate, authorize('admin', 'officer'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { organizationId: req.user.organizationId },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { organizationId: req.user.organizationId } }),
    ]);

    res.json({ data: logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error('activityLogs.list', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
module.exports.logActivity = logActivity;
