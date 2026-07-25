const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('./activityLogs');
const { notifyStatusChange } = require('../services/notificationService');
const logger = require('../lib/logger');

// POST /api/purchase-requests - Create PR (managers only)
router.post('/', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { itemName, category, quantity, budget, urgency, justification } = req.body;

    if (!itemName || !category || !quantity || !budget || !urgency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    if (!validUrgencies.includes(urgency)) {
      return res.status(400).json({ error: `Urgency must be one of: ${validUrgencies.join(', ')}` });
    }

    if (parseInt(quantity) < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    if (parseFloat(budget) <= 0) {
      return res.status(400).json({ error: 'Budget must be greater than 0' });
    }

    const pr = await prisma.purchaseRequest.create({
      data: {
        itemName,
        category,
        quantity: parseInt(quantity),
        budget: parseFloat(budget),
        urgency,
        justification: justification || '',
        userId: req.user.id,
        organizationId: req.user.organizationId,
        status: 'pending'
      }
    });

    logActivity(req.user.id, 'created', 'PurchaseRequest', pr.id, `Created PR: ${itemName}`, req.user.organizationId);

    res.status(201).json(pr);
  } catch (err) {
    logger.error('pr.create', err);
    res.status(500).json({ error: 'Failed to create purchase request' });
  }
});

// GET /api/purchase-requests/my-requests - Get manager's PRs
router.get('/my-requests', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100);
    const skip = (page - 1) * limit;
    const { search, status, urgency } = req.query;

    const where = { userId: req.user.id, organizationId: req.user.organizationId };
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (urgency && urgency !== 'all') {
      where.urgency = urgency;
    }
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo + 'T23:59:59.999Z');
    }

    const [prs, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        include: req.query.view === 'kanban'
          ? { _count: { select: { quotes: true } } }
          : { quotes: { include: { vendor: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    const data = req.query.view === 'kanban'
      ? prs.map(pr => ({ ...pr, quotes: Array.from({ length: pr._count.quotes }) }))
      : prs;

    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error('pr.myRequests', err);
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
});

// GET /api/purchase-requests - Get all PRs (officers/admin only)
router.get('/', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 100);
    const skip = (page - 1) * limit;
    const { search, status, urgency } = req.query;

    const where = { organizationId: req.user.organizationId };
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (urgency && urgency !== 'all') {
      where.urgency = urgency;
    }
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo + 'T23:59:59.999Z');
    }

    const [prs, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        include: req.query.view === 'kanban'
          ? { user: { select: { id: true, name: true, email: true } }, _count: { select: { quotes: true } } }
          : { user: { select: { id: true, name: true, email: true } }, quotes: { include: { vendor: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    const data = req.query.view === 'kanban'
      ? prs.map(pr => ({ ...pr, quotes: Array.from({ length: pr._count.quotes }) }))
      : prs;

    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error('pr.list', err);
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
});

// GET /api/purchase-requests/:id - Get single PR
router.get('/:id', authenticate, async (req, res) => {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        quotes: {
          include: { vendor: true },
          orderBy: { price: 'asc' }
        }
      }
    });

    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    // Managers can only view their own PRs
    if (req.user.role === 'manager' && pr.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(pr);
  } catch (err) {
    logger.error('pr.get', err, { prId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch purchase request' });
  }
});

// PATCH /api/purchase-requests/:id/status - Update PR status
router.patch('/:id/status', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'quoted', 'ordered', 'delivered'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const existingPr = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });
    if (!existingPr || existingPr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const pr = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { status }
    });

    logActivity(req.user.id, 'status_changed', 'PurchaseRequest', req.params.id, `Status changed to ${status}`, req.user.organizationId);

    // Notify the requester via email
    notifyStatusChange(req.params.id, status, req.user.name);

    res.json(pr);
  } catch (err) {
    logger.error('pr.updateStatus', err, { prId: req.params.id });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /api/purchase-requests/:id - Edit PR (owner manager or admin, only when pending)
router.put('/:id', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    const existingPr = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });

    if (!existingPr || existingPr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (existingPr.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingPr.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be edited' });
    }

    const { itemName, category, quantity, budget, urgency, justification } = req.body;

    if (urgency) {
      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      if (!validUrgencies.includes(urgency)) {
        return res.status(400).json({ error: `Urgency must be one of: ${validUrgencies.join(', ')}` });
      }
    }
    if (quantity !== undefined && parseInt(quantity) < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    if (budget !== undefined && parseFloat(budget) <= 0) {
      return res.status(400).json({ error: 'Budget must be greater than 0' });
    }

    const pr = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: {
        itemName: itemName || undefined,
        category: category || undefined,
        quantity: quantity ? parseInt(quantity) : undefined,
        budget: budget ? parseFloat(budget) : undefined,
        urgency: urgency || undefined,
        justification: justification !== undefined ? justification : undefined,
      },
    });

    logActivity(req.user.id, 'updated', 'PurchaseRequest', req.params.id, `Updated PR: ${pr.itemName}`, req.user.organizationId);

    res.json(pr);
  } catch (err) {
    logger.error('pr.edit', err, { prId: req.params.id });
    res.status(500).json({ error: 'Failed to update purchase request' });
  }
});

// PATCH /api/purchase-requests/:id/cancel - Cancel PR (owner manager or admin)
router.patch('/:id/cancel', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    const existingPr = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });

    if (!existingPr || existingPr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (existingPr.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingPr.status === 'ordered' || existingPr.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel an ordered or delivered request' });
    }

    const pr = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });

    logActivity(req.user.id, 'cancelled', 'PurchaseRequest', req.params.id, `Cancelled PR: ${existingPr.itemName}`, req.user.organizationId);

    res.json(pr);
  } catch (err) {
    logger.error('pr.cancel', err, { prId: req.params.id });
    res.status(500).json({ error: 'Failed to cancel purchase request' });
  }
});

// PATCH /api/purchase-requests/:id/rollback - Rollback PR status (officer/admin)
router.patch('/:id/rollback', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const existingPr = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } });

    if (!existingPr || existingPr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const rollbackMap = {
      ordered: 'quoted',
      quoted: 'pending',
    };

    const targetStatus = rollbackMap[existingPr.status];
    if (!targetStatus) {
      return res.status(400).json({ error: `Cannot rollback from "${existingPr.status}" status` });
    }

    const pr = await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { status: targetStatus },
    });

    logActivity(req.user.id, 'status_changed', 'PurchaseRequest', req.params.id, `Rolled back from ${existingPr.status} to ${targetStatus}`, req.user.organizationId);

    res.json(pr);
  } catch (err) {
    logger.error('pr.rollback', err, { prId: req.params.id });
    res.status(500).json({ error: 'Failed to rollback status' });
  }
});

module.exports = router;
