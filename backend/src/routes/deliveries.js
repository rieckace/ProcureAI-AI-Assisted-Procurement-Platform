const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const deliveryService = require('../services/deliveryService');
const logger = require('../lib/logger');

// GET /api/deliveries - List deliveries
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.overdue === 'true') filters.overdue = true;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const deliveries = await deliveryService.getDeliveries(req.user.organizationId, filters);
    res.json({ data: deliveries, count: deliveries.length });
  } catch (err) {
    logger.error('deliveries.list', err);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// GET /api/deliveries/overdue - Overdue deliveries
router.get('/overdue', authenticate, async (req, res) => {
  try {
    const deliveries = await deliveryService.getOverdueDeliveries(req.user.organizationId);
    res.json({ data: deliveries, count: deliveries.length });
  } catch (err) {
    logger.error('deliveries.overdue', err);
    res.status(500).json({ error: 'Failed to fetch overdue deliveries' });
  }
});

// PUT /api/deliveries/:id - Update delivery status
router.put('/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const delivery = await deliveryService.updateDeliveryStatus(
      req.params.id,
      req.user.organizationId,
      req.user.id,
      status,
      trackingNumber
    );
    res.json(delivery);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('deliveries.update', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
