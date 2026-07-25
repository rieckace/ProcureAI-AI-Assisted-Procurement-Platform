const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { scoreVendors, generateRecommendation } = require('../services/aiService');
const { sendQuoteRequestEmail, sendPurchaseOrderEmail } = require('../services/emailService');
const { logActivity } = require('./activityLogs');
const { notifyQuoteReceived, notifyPOIssued } = require('../services/notificationService');
const logger = require('../lib/logger');

// DELETE /api/purchase-requests/:prId/quotes/:quoteId - Delete a quote (officer/admin)
router.delete('/:prId/quotes/:quoteId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.quoteId },
      include: { vendor: true, purchaseRequest: true }
    });

    if (!quote || quote.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await prisma.quote.delete({ where: { id: req.params.quoteId } });

    // If no quotes remain, revert PR status to pending
    const remainingQuotes = await prisma.quote.count({ where: { prId: quote.prId } });
    if (remainingQuotes === 0) {
      await prisma.purchaseRequest.update({
        where: { id: quote.prId },
        data: { status: 'pending' }
      });
    }

    logActivity(req.user.id, 'deleted_quote', 'PurchaseRequest', quote.prId, `Deleted quote from ${quote.vendor.name}: $${quote.price}`, req.user.organizationId);

    res.json({ message: 'Quote deleted', remainingQuotes });
  } catch (err) {
    logger.error('quotes.delete', err, { quoteId: req.params.quoteId });
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// POST /api/purchase-requests/:id/quotes - Add quote (officers/admin only)
router.post('/:id/quotes', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { vendorId, price, deliveryDays } = req.body;

    if (!vendorId || !price || !deliveryDays) {
      return res.status(400).json({ error: 'Vendor, price, and delivery days are required' });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    if (parseInt(deliveryDays) < 1) {
      return res.status(400).json({ error: 'Delivery days must be at least 1' });
    }

    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: { prId: req.params.id, vendorId }
    });

    if (existingQuote) {
      return res.status(400).json({ error: `${vendor.name} already has a quote for this request. Delete the existing quote first.` });
    }

    const quote = await prisma.quote.create({
      data: {
        prId: req.params.id,
        vendorId,
        price: parseFloat(price),
        deliveryDays: parseInt(deliveryDays),
        organizationId: req.user.organizationId
      },
      include: { vendor: true }
    });

    // Update PR status to 'quoted'
    if (pr.status === 'pending') {
      await prisma.purchaseRequest.update({
        where: { id: req.params.id },
        data: { status: 'quoted' }
      });
    }

    logActivity(req.user.id, 'added_quote', 'PurchaseRequest', req.params.id, `Added quote from ${vendor.name}: $${price}`, req.user.organizationId);

    // Notify the requester
    notifyQuoteReceived(req.params.id, vendor.name, parseFloat(price));

    // Send email to vendor
    let emailResult = null;
    try {
      emailResult = await sendQuoteRequestEmail(vendor.email, vendor.name, {
        itemName: pr.itemName,
        category: pr.category,
        quantity: pr.quantity,
        budget: pr.budget,
        urgency: pr.urgency,
        justification: pr.justification
      });
    } catch (emailErr) {
      logger.warn('quotes.addQuote.sendEmail', emailErr.message);
    }

    res.status(201).json({
      quote,
      emailSent: !!emailResult,
      etherealUrl: emailResult?.previewUrl || null
    });
  } catch (err) {
    logger.error('quotes.addQuote', err);
    res.status(500).json({ error: 'Failed to add quote' });
  }
});

// GET /api/purchase-requests/:id/quotes - Get all quotes for a PR
router.get('/:id/quotes', authenticate, async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: { prId: req.params.id, organizationId: req.user.organizationId },
      include: { vendor: true },
      orderBy: { price: 'asc' }
    });

    res.json(quotes);
  } catch (err) {
    logger.error('quotes.list', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET /api/purchase-requests/:id/recommendation - AI vendor recommendation
router.get('/:id/recommendation', authenticate, async (req, res) => {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const quotes = await prisma.quote.findMany({
      where: { prId: req.params.id },
      include: { vendor: true }
    });

    if (quotes.length === 0) {
      return res.status(400).json({ error: 'No quotes available for this purchase request' });
    }

    // Score vendors
    const scoredVendors = scoreVendors(quotes);

    // Generate AI recommendation
    const recommendation = await generateRecommendation(pr, scoredVendors);

    // Calculate cost savings
    const topPrice = scoredVendors[0]?.price || 0;
    const avgPrice = scoredVendors.reduce((sum, v) => sum + v.price, 0) / scoredVendors.length;
    const cheapestPrice = Math.min(...scoredVendors.map(v => v.price));
    const potentialSavings = avgPrice - topPrice;

    res.json({
      purchaseRequest: {
        id: pr.id,
        itemName: pr.itemName,
        category: pr.category,
        quantity: pr.quantity,
        budget: pr.budget,
        urgency: pr.urgency,
        status: pr.status
      },
      rankedVendors: scoredVendors,
      recommendation,
      costAnalysis: {
        topPrice,
        averagePrice: Math.round(avgPrice * 100) / 100,
        cheapestPrice,
        potentialSavings: Math.round(Math.max(0, potentialSavings) * 100) / 100,
        budgetComparison: topPrice <= pr.budget
          ? `$${(pr.budget - topPrice).toLocaleString()} under budget`
          : `$${(topPrice - pr.budget).toLocaleString()} over budget`
      }
    });
  } catch (err) {
    logger.error('quotes.recommendation', err);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

// POST /api/purchase-requests/:id/issue-po - Issue purchase order
router.post('/:id/issue-po', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { vendorId, quoteId } = req.body;

    if (!vendorId && !quoteId) {
      return res.status(400).json({ error: 'Vendor ID or Quote ID is required' });
    }

    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (pr.status === 'ordered' || pr.status === 'delivered') {
      return res.status(400).json({ error: 'Purchase order already issued for this request' });
    }

    let quote;
    if (quoteId) {
      quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { vendor: true }
      });
    } else {
      quote = await prisma.quote.findFirst({
        where: { prId: req.params.id, vendorId },
        include: { vendor: true }
      });
    }

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Update PR status to 'ordered'
    await prisma.purchaseRequest.update({
      where: { id: req.params.id },
      data: { status: 'ordered' }
    });

    logActivity(req.user.id, 'issued_po', 'PurchaseRequest', req.params.id, `Issued PO to ${quote.vendor.name} for $${quote.price}`, req.user.organizationId);

    // Notify the requester
    notifyPOIssued(req.params.id, quote.vendor.name, quote.price);

    // Send purchase order email
    let emailResult = null;
    try {
      emailResult = await sendPurchaseOrderEmail(quote.vendor.email, quote.vendor.name, {
        itemName: pr.itemName,
        quantity: pr.quantity,
        price: quote.price,
        deliveryDays: quote.deliveryDays,
        urgency: pr.urgency
      });
    } catch (emailErr) {
      logger.warn('quotes.issuePo.sendEmail', emailErr.message);
    }

    res.json({
      message: 'Purchase order issued successfully',
      vendorName: quote.vendor.name,
      price: quote.price,
      deliveryDays: quote.deliveryDays,
      emailSent: !!emailResult,
      etherealUrl: emailResult?.previewUrl || null
    });
  } catch (err) {
    logger.error('quotes.issuePo', err);
    res.status(500).json({ error: 'Failed to issue purchase order' });
  }
});

module.exports = router;
