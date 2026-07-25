const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const logger = require('../lib/logger');

// GET /api/notifications - Fetch recent notifications for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 50);

    // Get activity logs from the user's organization, highlighting actions relevant to this user
    const notifications = await prisma.activityLog.findMany({
      where: {
        organizationId: req.user.organizationId,
        // For managers, only show their own PR-related activities
        ...(req.user.role === 'manager' && {
          OR: [
            { userId: req.user.id },
            { details: { contains: req.user.id, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Count unread — since we don't have a read status model yet,
    // treat anything newer than the user's last visit as "unread"
    // For now, return everything and let the frontend track
    const lastViewed = req.headers['x-last-viewed']
      ? new Date(parseInt(req.headers['x-last-viewed']))
      : new Date(Date.now() - 5 * 60 * 1000); // default: last 5 min

    const unreadCount = notifications.filter(n => new Date(n.createdAt) > lastViewed).length;

    res.json({
      data: notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (err) {
    logger.error('notifications.get', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/read - Mark notifications as read (dummy endpoint for future use)
router.patch('/read', authenticate, (req, res) => {
  res.json({ message: 'Notifications marked as read' });
});

module.exports = router;
