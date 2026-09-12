const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const inventoryService = require('../services/inventoryService');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// GET /api/inventory - List inventory items
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await inventoryService.getInventory(req.user.organizationId, {
      search: req.query.search,
      category: req.query.category,
      lowStock: req.query.lowStock === 'true',
      limit: parseInt(req.query.limit) || 100,
    });
    res.json({ data: items, count: items.length });
  } catch (err) {
    logger.error('inventory.list', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/alerts - Low stock alerts
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const items = await inventoryService.getLowStockAlerts(req.user.organizationId);
    res.json({ data: items, count: items.length });
  } catch (err) {
    logger.error('inventory.alerts', err);
    res.status(500).json({ error: 'Failed to fetch inventory alerts' });
  }
});

// POST /api/inventory - Add inventory item
router.post('/', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const item = await inventoryService.addItem(req.user.organizationId, req.user.id, req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(400).json({ error: err.message });
    }
    logger.error('inventory.create', err);
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
});

// PUT /api/inventory/:id/stock - Update stock level
router.put('/:id/stock', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { quantity, type } = req.body;
    if (quantity === undefined || !type) {
      return res.status(400).json({ error: 'Quantity and type (add/deduct/set) are required' });
    }
    const item = await inventoryService.updateStock(req.params.id, req.user.organizationId, req.user.id, quantity, type);
    res.json(item);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('inventory.updateStock', err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// PUT /api/inventory/:id - Update inventory item details
router.put('/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { itemName, category, unit, minStockLevel, unitPrice } = req.body;
    
    const item = await prisma.inventory.findUnique({ where: { id: req.params.id } });
    if (!item || item.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const updated = await prisma.inventory.update({
      where: { id: req.params.id },
      data: {
        itemName: itemName || undefined,
        category: category || undefined,
        unit: unit || undefined,
        minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
      }
    });

    res.json(updated);
  } catch (err) {
    logger.error('inventory.update', err);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const result = await inventoryService.deleteItem(req.params.id, req.user.organizationId, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('inventory.delete', err);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

module.exports = router;
