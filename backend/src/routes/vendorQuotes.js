const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { notifyQuoteReceived } = require('../services/notificationService');
const logger = require('../lib/logger');

// GET /api/quotes/vendor-quote/:token - Get quote request details (public, no auth)
router.get('/vendor-quote/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const quoteRequest = await prisma.quoteRequest.findUnique({
      where: { token },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        purchaseRequest: {
          include: {
            organization: { select: { name: true } },
          }
        },
      }
    });

    if (!quoteRequest) {
      return res.status(404).json({ error: 'Invalid quote request link' });
    }

    if (quoteRequest.status === 'completed') {
      return res.status(400).json({ error: 'This quote has already been submitted', completed: true });
    }

    if (quoteRequest.status === 'cancelled') {
      return res.status(400).json({ error: 'This quote request has been cancelled by the procurement team', cancelled: true });
    }

    if (new Date(quoteRequest.expiresAt) < new Date()) {
      await prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: { status: 'expired' }
      });
      return res.status(400).json({ error: 'This quote request has expired', expired: true });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: {
        prId: quoteRequest.prId,
        vendorId: quoteRequest.vendorId,
      }
    });

    // Agent-estimated quotes don't block a real vendor submission
    if (existingQuote && !existingQuote.notes?.includes('Auto-estimated by Procura')) {
      return res.status(400).json({ error: 'A quote has already been submitted for this request', completed: true });
    }

    const pr = quoteRequest.purchaseRequest;

    res.json({
      token,
      vendor: quoteRequest.vendor,
      purchaseRequest: {
        itemName: pr.itemName,
        category: pr.category,
        quantity: pr.quantity,
        unit: pr.unit || 'unit',
        budget: pr.budget,
        urgency: pr.urgency,
        justification: pr.justification,
        organizationName: pr.organization.name,
      },
      expiresAt: quoteRequest.expiresAt,
    });
  } catch (err) {
    logger.error('vendorQuotes.get', err);
    res.status(500).json({ error: 'Failed to load quote request' });
  }
});

// POST /api/quotes/vendor-quote/:token - Submit vendor quote (public, no auth)
router.post('/vendor-quote/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { price, unitPrice, deliveryDays, notes } = req.body;

    if ((!price && !unitPrice) || !deliveryDays) {
      return res.status(400).json({ error: 'Price (or unit price) and delivery days are required' });
    }

    if (price !== undefined && parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    if (unitPrice !== undefined && parseFloat(unitPrice) <= 0) {
      return res.status(400).json({ error: 'Unit price must be greater than 0' });
    }

    if (parseInt(deliveryDays) < 1) {
      return res.status(400).json({ error: 'Delivery days must be at least 1' });
    }

    const quoteRequest = await prisma.quoteRequest.findUnique({
      where: { token },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        purchaseRequest: true,
      }
    });

    if (!quoteRequest) {
      return res.status(404).json({ error: 'Invalid quote request link' });
    }

    if (quoteRequest.status === 'cancelled') {
      return res.status(400).json({ error: 'This quote request has been cancelled. Please contact the procurement team.' });
    }

    if (new Date(quoteRequest.expiresAt) < new Date()) {
      await prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: { status: 'expired' }
      });
      return res.status(400).json({ error: 'This quote request has expired' });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: {
        prId: quoteRequest.prId,
        vendorId: quoteRequest.vendorId,
      }
    });

    if (existingQuote && !existingQuote.notes?.includes('Auto-estimated by Procura')) {
      return res.status(400).json({ error: 'A quote has already been submitted for this request' });
    }

    // Atomically claim the quote request so two concurrent submissions with the
    // same token cannot both pass the guards and create duplicate quotes.
    const claimed = await prisma.quoteRequest.updateMany({
      where: { id: quoteRequest.id, status: 'sent' },
      data: { status: 'completed', completedAt: new Date() }
    });

    if (claimed.count === 0) {
      return res.status(400).json({ error: 'This quote has already been submitted' });
    }

    // Replace the agent's estimated quote with the vendor's real quote
    if (existingQuote) {
      await prisma.quote.delete({ where: { id: existingQuote.id } });
    }

    // Per-unit price → total = unitPrice × PR quantity (e.g. 22kg at ₹50/kg = ₹1100)
    let finalPrice = price !== undefined ? parseFloat(price) : null;
    if (unitPrice !== undefined) {
      finalPrice = Math.round(parseFloat(unitPrice) * quoteRequest.purchaseRequest.quantity * 100) / 100;
    }

    const quote = await prisma.quote.create({
      data: {
        prId: quoteRequest.prId,
        vendorId: quoteRequest.vendorId,
        organizationId: quoteRequest.organizationId,
        price: finalPrice,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        deliveryDays: parseInt(deliveryDays),
        notes: notes || undefined,
      },
      include: { vendor: true }
    });

    const pr = quoteRequest.purchaseRequest;
    if (pr.status === 'pending') {
      await prisma.purchaseRequest.update({
        where: { id: pr.id },
        data: { status: 'quoted' }
      });
    }

    notifyQuoteReceived(pr.id, quote.vendor.name, finalPrice);

    logger.info('vendorQuotes.submit', `Quote submitted by ${quoteRequest.vendor.name}`, {
      vendorId: quoteRequest.vendorId,
      prId: quoteRequest.prId,
      price: finalPrice,
      unitPrice: unitPrice,
      deliveryDays: deliveryDays,
    });

    res.status(201).json({
      message: 'Quote submitted successfully',
      quote: {
        id: quote.id,
        vendorName: quote.vendor.name,
        price: quote.price,
        deliveryDays: quote.deliveryDays,
        notes: quote.notes,
        createdAt: quote.createdAt,
      }
    });
  } catch (err) {
    logger.error('vendorQuotes.submit', err);
    res.status(500).json({ error: 'Failed to submit quote' });
  }
});

module.exports = router;
