const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { scoreVendors, generateRecommendation } = require('../services/aiService');
const { sendVendorQuoteEmail } = require('../services/emailService');
const poGeneratorService = require('../services/poGeneratorService');
const { logActivity } = require('./activityLogs');
const { notifyQuoteReceived } = require('../services/notificationService');
const logger = require('../lib/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// POST /api/purchase-requests/:id/send-requests - Send quote request emails to vendors
router.post('/:id/send-requests', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { vendorIds } = req.body;

    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({ error: 'At least one vendor ID is required' });
    }

    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (pr.status === 'ordered' || pr.status === 'delivered' || pr.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot send quote requests for an ordered, delivered, or rejected request' });
    }

    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds }, organizationId: req.user.organizationId }
    });

    if (vendors.length === 0) {
      return res.status(404).json({ error: 'No valid vendors found' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const results = [];

    for (const vendor of vendors) {
      const existingQuote = await prisma.quote.findFirst({
        where: { prId: pr.id, vendorId: vendor.id }
      });
      // Agent-estimated quotes can be replaced — allow real quote requests for those vendors
      if (existingQuote && !existingQuote.notes?.includes('Auto-estimated by Procura')) {
        results.push({ vendorId: vendor.id, vendorName: vendor.name, status: 'skipped', reason: 'Quote already exists' });
        continue;
      }

      const existingRequest = await prisma.quoteRequest.findFirst({
        where: { prId: pr.id, vendorId: vendor.id }
      });

      if (existingRequest) {
        // If already completed, skip
        if (existingRequest.status === 'completed') {
          results.push({ vendorId: vendor.id, vendorName: vendor.name, status: 'skipped', reason: 'Quote already submitted' });
          continue;
        }
        // If still active, skip
        if ((existingRequest.status === 'sent' || existingRequest.status === 'pending') && new Date(existingRequest.expiresAt) > new Date()) {
          results.push({ vendorId: vendor.id, vendorName: vendor.name, status: 'skipped', reason: 'Request already pending' });
          continue;
        }
        // Otherwise (cancelled or expired) — update the existing record instead of creating a new one
        const token = crypto.randomBytes(32).toString('hex');

        await prisma.quoteRequest.update({
          where: { id: existingRequest.id },
          data: {
            token,
            status: 'sent',
            sentAt: new Date(),
            expiresAt,
            completedAt: null,
          }
        });

        const quoteFormUrl = `${FRONTEND_URL}/vendor-quote/${token}`;

        let emailResult = null;
        try {
          emailResult = await sendVendorQuoteEmail(
            vendor.email,
            vendor.name,
            {
              itemName: pr.itemName,
              category: pr.category,
              quantity: pr.quantity,
              unit: pr.unit || 'unit',
              budget: pr.budget,
              urgency: pr.urgency,
              justification: pr.justification,
            },
            quoteFormUrl,
            expiresAt
          );
        } catch (emailErr) {
          logger.warn('quotes.sendRequests.emailFailed', emailErr.message, { vendorId: vendor.id });
        }

        results.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          status: emailResult ? 'sent' : 'email_failed',
          emailSent: !!emailResult,
          renewed: true,
        });
        continue;
      }

      const token = crypto.randomBytes(32).toString('hex');

      const quoteRequest = await prisma.quoteRequest.create({
        data: {
          prId: pr.id,
          vendorId: vendor.id,
          organizationId: req.user.organizationId,
          token,
          status: 'sent',
          sentAt: new Date(),
          expiresAt,
        }
      });

      const quoteFormUrl = `${FRONTEND_URL}/vendor-quote/${token}`;

      let emailResult = null;
      try {
        emailResult = await sendVendorQuoteEmail(
          vendor.email,
          vendor.name,
          {
            itemName: pr.itemName,
            category: pr.category,
            quantity: pr.quantity,
            unit: pr.unit || 'unit',
            budget: pr.budget,
            urgency: pr.urgency,
            justification: pr.justification,
          },
          quoteFormUrl,
          expiresAt
        );
      } catch (emailErr) {
        logger.warn('quotes.sendRequests.emailFailed', emailErr.message, { vendorId: vendor.id });
      }

      results.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        status: emailResult ? 'sent' : 'email_failed',
        emailSent: !!emailResult,
      });
    }

    logActivity(
      req.user.id,
      'sent_quote_requests',
      'PurchaseRequest',
      pr.id,
      `Sent quote requests to ${results.filter(r => r.status === 'sent').length} vendor(s)`,
      req.user.organizationId
    );

    res.json({
      message: 'Quote requests processed',
      results,
      expiresAt,
    });
  } catch (err) {
    logger.error('quotes.sendRequests', err);
    res.status(500).json({ error: 'Failed to send quote requests' });
  }
});

// GET /api/purchase-requests/:id/quote-requests - Get quote request status for a PR
router.get('/:id/quote-requests', authenticate, async (req, res) => {
  try {
    const requests = await prisma.quoteRequest.findMany({
      where: { prId: req.params.id, organizationId: req.user.organizationId },
      include: { vendor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (err) {
    logger.error('quotes.listQuoteRequests', err);
    res.status(500).json({ error: 'Failed to fetch quote requests' });
  }
});

// POST /api/purchase-requests/:id/resend-request/:requestId - Resend expired quote request
router.post('/:id/resend-request/:requestId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const quoteRequest = await prisma.quoteRequest.findUnique({
      where: { id: req.params.requestId },
      include: { vendor: true, purchaseRequest: true }
    });

    if (!quoteRequest || quoteRequest.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Quote request not found' });
    }

    if (quoteRequest.prId !== req.params.id) {
      return res.status(400).json({ error: 'Quote request does not belong to this purchase request' });
    }

    if (quoteRequest.status === 'completed') {
      return res.status(400).json({ error: 'Cannot resend — vendor has already submitted a quote' });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: { prId: quoteRequest.prId, vendorId: quoteRequest.vendorId }
    });
    if (existingQuote) {
      return res.status(400).json({ error: 'Cannot resend — a quote already exists for this vendor' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.quoteRequest.update({
      where: { id: quoteRequest.id },
      data: {
        token,
        status: 'sent',
        sentAt: new Date(),
        expiresAt,
        completedAt: null,
      }
    });

    const quoteFormUrl = `${FRONTEND_URL}/vendor-quote/${token}`;

    let emailResult = null;
    try {
      emailResult = await sendVendorQuoteEmail(
        quoteRequest.vendor.email,
        quoteRequest.vendor.name,
        {
          itemName: quoteRequest.purchaseRequest.itemName,
          category: quoteRequest.purchaseRequest.category,
          quantity: quoteRequest.purchaseRequest.quantity,
          unit: quoteRequest.purchaseRequest.unit || 'unit',
          budget: quoteRequest.purchaseRequest.budget,
          urgency: quoteRequest.purchaseRequest.urgency,
          justification: quoteRequest.purchaseRequest.justification,
        },
        quoteFormUrl,
        expiresAt
      );
    } catch (emailErr) {
      logger.warn('quotes.resendRequest.emailFailed', emailErr.message, { vendorId: quoteRequest.vendorId });
    }

    logActivity(
      req.user.id,
      'resent_quote_request',
      'PurchaseRequest',
      quoteRequest.prId,
      `Resent quote request to ${quoteRequest.vendor.name}`,
      req.user.organizationId
    );

    res.json({
      message: emailResult ? 'Quote request resent successfully' : 'Request resent but email failed',
      emailSent: !!emailResult,
    });
  } catch (err) {
    logger.error('quotes.resendRequest', err);
    res.status(500).json({ error: 'Failed to resend quote request' });
  }
});

// POST /api/purchase-requests/:id/cancel-request/:requestId - Cancel a pending/sent quote request (officer/admin)
router.post('/:id/cancel-request/:requestId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const quoteRequest = await prisma.quoteRequest.findUnique({
      where: { id: req.params.requestId },
      include: { vendor: true, purchaseRequest: true }
    });

    if (!quoteRequest || quoteRequest.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Quote request not found' });
    }

    if (quoteRequest.prId !== req.params.id) {
      return res.status(400).json({ error: 'Quote request does not belong to this purchase request' });
    }

    if (quoteRequest.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel — vendor has already submitted a quote' });
    }

    if (quoteRequest.status === 'cancelled') {
      return res.status(400).json({ error: 'Quote request is already cancelled' });
    }

    await prisma.quoteRequest.update({
      where: { id: quoteRequest.id },
      data: { status: 'cancelled' }
    });

    logActivity(
      req.user.id,
      'cancelled_quote_request',
      'PurchaseRequest',
      quoteRequest.prId,
      `Cancelled quote request to ${quoteRequest.vendor.name}`,
      req.user.organizationId
    );

    res.json({ message: 'Quote request cancelled successfully' });
  } catch (err) {
    logger.error('quotes.cancelRequest', err);
    res.status(500).json({ error: 'Failed to cancel quote request' });
  }
});

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

    // If a quote request exists for this vendor+PR, reset it so the officer can resend
    const existingQuoteRequest = await prisma.quoteRequest.findFirst({
      where: { prId: quote.prId, vendorId: quote.vendorId, status: 'completed' }
    });
    if (existingQuoteRequest) {
      // Set to cancelled — the officer must explicitly resend (which will generate a new token + email)
      await prisma.quoteRequest.update({
        where: { id: existingQuoteRequest.id },
        data: {
          status: 'cancelled',
          completedAt: null,
        }
      });
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

    logActivity(req.user.id, 'deleted_quote', 'PurchaseRequest', quote.prId, `Deleted quote from ${quote.vendor.name}: ₹${quote.price}`, req.user.organizationId);

    res.json({ message: 'Quote deleted', remainingQuotes });
  } catch (err) {
    logger.error('quotes.delete', err, { quoteId: req.params.quoteId });
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// POST /api/purchase-requests/:id/quotes - Add quote (officers/admin only)
router.post('/:id/quotes', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { vendorId, price, unitPrice, deliveryDays } = req.body;

    if (!vendorId || (!price && !unitPrice) || !deliveryDays) {
      return res.status(400).json({ error: 'Vendor, price (or unit price), and delivery days are required' });
    }

    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: req.params.id }
    });

    // If a per-unit price is provided, compute the total from the PR quantity.
    // e.g. PR of 22kg at ₹50/kg → total ₹1100 (22 units of that good).
    let finalPrice = parseFloat(price);
    if (unitPrice !== undefined) {
      if (parseFloat(unitPrice) <= 0) {
        return res.status(400).json({ error: 'Unit price must be greater than 0' });
      }
      if (!pr) {
        return res.status(404).json({ error: 'Purchase request not found' });
      }
      finalPrice = Math.round(parseFloat(unitPrice) * pr.quantity * 100) / 100;
    }

    if (finalPrice <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    if (parseInt(deliveryDays) < 1) {
      return res.status(400).json({ error: 'Delivery days must be at least 1' });
    }

    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (pr.status === 'ordered' || pr.status === 'delivered' || pr.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot add quotes to an ordered, delivered, or rejected request' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor || vendor.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: { prId: req.params.id, vendorId }
    });

    if (existingQuote && !existingQuote.notes?.includes('Auto-estimated by Procura')) {
      return res.status(400).json({ error: `${vendor.name} already has a quote for this request. Delete the existing quote first.` });
    }

    // If the existing quote was auto-estimated by the agent, replace it with the real one
    if (existingQuote) {
      await prisma.quote.delete({ where: { id: existingQuote.id } });
    }

    const quote = await prisma.quote.create({
      data: {
        prId: req.params.id,
        vendorId,
        price: finalPrice,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
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

    logActivity(req.user.id, 'added_quote', 'PurchaseRequest', req.params.id, `Added quote from ${vendor.name}: ₹${finalPrice}`, req.user.organizationId);

    notifyQuoteReceived(req.params.id, vendor.name, finalPrice);

    res.status(201).json({
      quote,
      emailSent: false,
      etherealUrl: null
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
          ? `₹${(pr.budget - topPrice).toLocaleString('en-IN')} under budget`
          : `₹${(topPrice - pr.budget).toLocaleString('en-IN')} over budget`
      }
    });
  } catch (err) {
    logger.error('quotes.recommendation', err);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

// POST /api/purchase-requests/:id/issue-po - Issue purchase order
// Uses the unified PO generator so POs appear in /purchase-orders and
// deliveries are tracked on /deliveries.
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

    if (pr.status === 'ordered' || pr.status === 'delivered' || pr.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot issue PO for an ordered, delivered, or rejected request' });
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

    // Generate PO + delivery record (also updates PR status, notifies, emails vendor)
    const po = await poGeneratorService.createPO(pr.id, quote.vendorId, req.user.id, req.user.organizationId);

    res.status(201).json({
      message: `Purchase Order ${po.poNumber} issued successfully`,
      poNumber: po.poNumber,
      vendorName: po.vendor?.name || quote.vendor.name,
      price: po.totalAmount,
      emailSent: !!po.emailPreviewUrl,
      etherealUrl: po.emailPreviewUrl || null,
    });
  } catch (err) {
    logger.error('quotes.issuePo', err);
    if (err.message?.includes('already exists')) {
      return res.status(400).json({ error: err.message, alreadyOrdered: true });
    }
    res.status(400).json({ error: err.message || 'Failed to issue purchase order' });
  }
});

module.exports = router;
