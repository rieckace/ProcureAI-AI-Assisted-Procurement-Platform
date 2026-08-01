const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const poGeneratorService = require('../services/poGeneratorService');
const logger = require('../lib/logger');

// GET /api/purchase-orders - List all POs
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await poGeneratorService.getPurchaseOrders(req.user.organizationId, {
      status: req.query.status,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ data: orders, count: orders.length });
  } catch (err) {
    logger.error('purchaseOrders.list', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /api/purchase-orders/:id - Get single PO with details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const po = await poGeneratorService.getPOById(req.params.id, req.user.organizationId);
    res.json(po);
  } catch (err) {
    if (err.message === 'Purchase Order not found') {
      return res.status(404).json({ error: err.message });
    }
    logger.error('purchaseOrders.get', err);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// POST /api/purchase-orders/generate - Generate a PO from PR + vendor
router.post('/generate', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { prId, vendorId } = req.body;
    if (!prId || !vendorId) {
      return res.status(400).json({ error: 'prId and vendorId are required' });
    }

    const po = await poGeneratorService.createPO(prId, vendorId, req.user.id, req.user.organizationId);
    res.status(201).json(po);
  } catch (err) {
    logger.error('purchaseOrders.generate', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/approve - Approve a PO
router.post('/:id/approve', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const po = await poGeneratorService.approvePO(req.params.id, req.user.id, req.user.organizationId);
    res.json(po);
  } catch (err) {
    logger.error('purchaseOrders.approve', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/status - Update PO status through its lifecycle
router.post('/:id/status', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const po = await poGeneratorService.updatePOStatus(req.params.id, req.user.id, req.user.organizationId, status);
    res.json(po);
  } catch (err) {
    logger.error('purchaseOrders.updateStatus', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
