const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const logger = require('../lib/logger');

// GET /api/notifications - Fetch unread notifications for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 100);

    const includeRead = req.query.includeRead === 'true';
    const whereClause = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      ...(includeRead ? {} : { read: false }),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: req.user.id, organizationId: req.user.organizationId, read: false },
      }),
    ]);

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

// POST /api/notifications/read/:id - Mark a single notification as read
router.post('/read/:id', authenticate, async (req, res) => {
  try {
    const notif = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    logger.error('notifications.read', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, organizationId: req.user.organizationId, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    logger.error('notifications.readAll', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    logger.error('notifications.delete', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
