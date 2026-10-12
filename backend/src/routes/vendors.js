const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotificationForRole } = require('../services/notificationService');
const logger = require('../lib/logger');

// GET /api/vendors - List all vendors
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 100);
    const skip = (page - 1) * limit;

    const where = { organizationId: req.user.organizationId };
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { category: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    if (req.query.category) {
      where.category = req.query.category;
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ]);

    res.json({ data: vendors, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error('vendors.list', err, { search: req.query.search });
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /api/vendors/:id - Get single vendor (with their product catalog)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        products: { orderBy: { name: 'asc' } },
      },
    });

    if (!vendor || vendor.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (err) {
    logger.error('vendors.get', err, { vendorId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// GET /api/vendors/:id/products - Get a vendor's product catalog
router.get('/:id/products', authenticate, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      select: { id: true, organizationId: true },
    });

    if (!vendor || vendor.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const where = { vendorId: req.params.id, organizationId: req.user.organizationId };
    if (req.query.search) {
      where.name = { contains: req.query.search, mode: 'insensitive' };
    }
    if (req.query.category) {
      where.category = req.query.category;
    }
    if (req.query.status) {
      where.status = req.query.status;
    }

    const products = await prisma.vendorProduct.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json({ data: products, count: products.length });
  } catch (err) {
    logger.error('vendors.listProducts', err, { vendorId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch vendor products' });
  }
});

// POST /api/vendors/:id/products - Add a product to a vendor's catalog (officer/admin)
router.post('/:id/products', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { name, category, unit, unitPrice, availableQty, status } = req.body;

    if (!name || !category || unitPrice === undefined) {
      return res.status(400).json({ error: 'Name, category, and unit price are required' });
    }

    if (parseFloat(unitPrice) <= 0) {
      return res.status(400).json({ error: 'Unit price must be greater than 0' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      select: { id: true, organizationId: true },
    });

    if (!vendor || vendor.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const existing = await prisma.vendorProduct.findUnique({
      where: { vendorId_name: { vendorId: req.params.id, name } },
    });
    if (existing) {
      return res.status(400).json({ error: `${name} is already in this vendor's catalog` });
    }

    const validStatuses = ['available', 'low_stock', 'out_of_stock', 'discontinued'];
    const product = await prisma.vendorProduct.create({
      data: {
        name,
        category,
        unit: unit || 'unit',
        unitPrice: parseFloat(unitPrice),
        availableQty: parseInt(availableQty) || 0,
        status: status && validStatuses.includes(status) ? status : 'available',
        vendorId: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    createNotificationForRole({
      organizationId: req.user.organizationId,
      role: 'admin',
      type: 'vendor_added',
      title: `📦 Product Added: ${name}`,
      message: `${req.user.name} added "${name}" to ${vendor.name}'s catalog`,
      link: `/manage-vendors/${req.params.id}`,
      excludeUserId: req.user.id,
    });

    res.status(201).json(product);
  } catch (err) {
    logger.error('vendors.addProduct', err, { vendorId: req.params.id });
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// PUT /api/vendors/:id/products/:productId - Update a product (officer/admin)
router.put('/:id/products/:productId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { name, category, unit, unitPrice, availableQty, status } = req.body;

    const product = await prisma.vendorProduct.findUnique({
      where: { id: req.params.productId },
    });

    if (!product || product.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.params.id) {
      return res.status(400).json({ error: 'Product does not belong to this vendor' });
    }

    if (unitPrice !== undefined && parseFloat(unitPrice) <= 0) {
      return res.status(400).json({ error: 'Unit price must be greater than 0' });
    }

    const validStatuses = ['available', 'low_stock', 'out_of_stock', 'discontinued'];
    const updated = await prisma.vendorProduct.update({
      where: { id: req.params.productId },
      data: {
        name: name || undefined,
        category: category || undefined,
        unit: unit || undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        availableQty: availableQty !== undefined ? parseInt(availableQty) : undefined,
        status: status && validStatuses.includes(status) ? status : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    logger.error('vendors.updateProduct', err, { productId: req.params.productId });
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/vendors/:id/products/:productId - Delete a product (officer/admin)
router.delete('/:id/products/:productId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const product = await prisma.vendorProduct.findUnique({
      where: { id: req.params.productId },
    });

    if (!product || product.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.params.id) {
      return res.status(400).json({ error: 'Product does not belong to this vendor' });
    }

    await prisma.vendorProduct.delete({ where: { id: req.params.productId } });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    logger.error('vendors.deleteProduct', err, { productId: req.params.productId });
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/vendors - Add vendor (officers/admin only)
router.post('/', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { name, email, category, phone, onTimeDelivery, defectRate, rating } = req.body;

    if (!name || !email || !category) {
      return res.status(400).json({ error: 'Name, email, and category are required' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingVendor = await prisma.vendor.findFirst({
      where: { email, organizationId: req.user.organizationId }
    });
    if (existingVendor) {
      return res.status(400).json({ error: 'Vendor with this email already exists in your organization' });
    }

    const otd = onTimeDelivery !== undefined ? parseFloat(onTimeDelivery) : 95;
    const dr = defectRate !== undefined ? parseFloat(defectRate) : 1;
    const rt = rating !== undefined ? parseFloat(rating) : 4.0;
    if (otd < 0 || otd > 100) return res.status(400).json({ error: 'On-time delivery must be 0-100%' });
    if (dr < 0 || dr > 100) return res.status(400).json({ error: 'Defect rate must be 0-100%' });
    if (rt < 1 || rt > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email,
        category,
        phone: phone || null,
        onTimeDelivery: otd,
        defectRate: dr,
        rating: rt,
        organizationId: req.user.organizationId
      }
    });

    // Notify admins when a vendor is added
    createNotificationForRole({
      organizationId: req.user.organizationId,
      role: 'admin',
      type: 'vendor_added',
      title: `🏢 New Vendor: ${name}`,
      message: `${req.user.name} added "${name}" (${category}) to the vendor list`,
      link: '/manage-vendors',
      excludeUserId: req.user.id,
    });

    res.status(201).json(vendor);
  } catch (err) {
    logger.error('vendors.create', err);
    res.status(500).json({ error: 'Failed to add vendor' });
  }
});

// PUT /api/vendors/:id - Update vendor (officers/admin only)
router.put('/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { name, email, category, phone, onTimeDelivery, defectRate, rating } = req.body;

    const existingVendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!existingVendor || existingVendor.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (email && email !== existingVendor.email) {
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      const emailTaken = await prisma.vendor.findFirst({
        where: { email, organizationId: req.user.organizationId }
      });
      if (emailTaken) {
        return res.status(400).json({ error: 'Vendor with this email already exists in your organization' });
      }
    }

    if (onTimeDelivery !== undefined && (parseFloat(onTimeDelivery) < 0 || parseFloat(onTimeDelivery) > 100)) {
      return res.status(400).json({ error: 'On-time delivery must be 0-100%' });
    }
    if (defectRate !== undefined && (parseFloat(defectRate) < 0 || parseFloat(defectRate) > 100)) {
      return res.status(400).json({ error: 'Defect rate must be 0-100%' });
    }
    if (rating !== undefined && (parseFloat(rating) < 1 || parseFloat(rating) > 5)) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        email: email || undefined,
        category: category || undefined,
        phone: phone !== undefined ? phone : undefined,
        onTimeDelivery: onTimeDelivery !== undefined ? parseFloat(onTimeDelivery) : undefined,
        defectRate: defectRate !== undefined ? parseFloat(defectRate) : undefined,
        rating: rating !== undefined ? parseFloat(rating) : undefined,
      },
    });

    res.json(vendor);
  } catch (err) {
    logger.error('vendors.update', err, { vendorId: req.params.id });
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE /api/vendors/:id - Delete vendor (officers/admin only)
router.delete('/:id', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: { quotes: true, quoteRequests: true },
    });

    if (!existingVendor || existingVendor.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.quotes.length > 0) {
      return res.status(400).json({ error: 'Cannot delete vendor with existing quotes. Remove quotes first.' });
    }

    // Delete associated quote requests first to avoid foreign key constraint
    if (existingVendor.quoteRequests.length > 0) {
      await prisma.quoteRequest.deleteMany({
        where: { vendorId: req.params.id }
      });
    }

    // Delete the vendor's product catalog
    await prisma.vendorProduct.deleteMany({
      where: { vendorId: req.params.id }
    });

    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    logger.error('vendors.delete', err, { vendorId: req.params.id });
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

module.exports = router;
