const prisma = require('../lib/prisma');
const { logActivity } = require('../routes/activityLogs');
const { createNotification, createNotificationForRole, notifyPOIssued } = require('./notificationService');
const { sendPurchaseOrderEmail } = require('./emailService');
const logger = require('../lib/logger');

/**
 * Generate next PO number for an organization
 * Format: PO-{YEAR}-{SEQUENTIAL}
 * Scans upward past any numbers that are already taken so a stale "max" read
 * can never hand out a duplicate (poNumber is UNIQUE in the schema).
 */
async function generatePONumber(orgId) {
  const year = new Date().getFullYear();
  let seq = 1;
  while (seq <= 99999) {
    const candidate = `PO-${year}-${String(seq).padStart(3, '0')}`;
    const exists = await prisma.purchaseOrder.findUnique({ where: { poNumber: candidate } });
    if (!exists) return candidate;
    seq += 1;
  }
  throw new Error(`Unable to allocate a PO number for ${year}`);
}

/**
 * Create a Purchase Order from an approved PR + vendor
 */
async function createPO(prId, vendorId, userId, orgId) {
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: prId },
    include: { quotes: { include: { vendor: true } } }
  });

  if (!pr || pr.organizationId !== orgId) {
    throw new Error('Purchase request not found');
  }

  // Find the selected vendor's quote
  const quote = pr.quotes.find(q => q.vendorId === vendorId);
  if (!quote) {
    throw new Error(`No quote found for vendor ${vendorId}`);
  }

  // Build + create the PO. poNumber is UNIQUE, so a concurrent create that
  // allocated the same number fails with P2002 — regenerate and retry instead
  // of 500ing. The existing-PO check runs on every attempt, so a concurrent
  // double-submit for the same PR is also caught on retry.
  let po = null;
  let poNumber = null;
  for (let attempt = 0; attempt < 50 && !po; attempt++) {
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { purchaseRequestId: prId }
    });
    if (existingPO) {
      throw new Error(`A purchase order (${existingPO.poNumber}) already exists for this request`);
    }

    poNumber = await generatePONumber(orgId);

    try {
      po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          purchaseRequestId: prId,
          vendorId,
          totalAmount: quote.price,
          status: 'PENDING_APPROVAL',
          expectedDelivery: new Date(Date.now() + quote.deliveryDays * 24 * 60 * 60 * 1000),
          organizationId: orgId,
        },
        include: {
          purchaseRequest: true,
          vendor: true,
        }
      });
    } catch (err) {
      if (err.code === 'P2002' && String(err.meta?.target ?? '').includes('poNumber')) {
        po = null; // another request grabbed this number — try the next one
        continue;
      }
      throw err;
    }
  }

  if (!po) {
    throw new Error('Unable to allocate a unique PO number');
  }

  // Update PR status
  await prisma.purchaseRequest.update({
    where: { id: prId },
    data: { status: 'ordered' }
  });

  logActivity(userId, 'created', 'PurchaseOrder', po.id, `Generated PO ${poNumber} for ${pr.itemName}`, orgId);

  // Create delivery record
  await prisma.delivery.create({
    data: {
      purchaseOrderId: po.id,
      status: 'PREPARING',
      estimatedArrival: po.expectedDelivery,
    }
  });

  // Notify
  await createNotificationForRole({
    organizationId: orgId,
    role: 'admin',
    type: 'po_issued',
    title: `📦 PO Generated: ${poNumber}`,
    message: `Purchase Order ${poNumber} generated for "${pr.itemName}" from ${quote.vendor.name} — ₹${quote.price.toLocaleString('en-IN')}`,
    link: `/pr/${prId}`,
  });

  // Send email to vendor
  let emailPreviewUrl = null;
  try {
    const emailResult = await sendPurchaseOrderEmail(quote.vendor.email, quote.vendor.name, {
      itemName: pr.itemName,
      quantity: pr.quantity,
      unit: pr.unit || 'unit',
      price: quote.price,
      deliveryDays: quote.deliveryDays,
      poNumber,
    });
    emailPreviewUrl = emailResult?.previewUrl || null;
  } catch (err) {
    logger.warn('poGenerator.sendEmail', err.message);
  }

  // Notify the PR requester
  notifyPOIssued(prId, quote.vendor.name, quote.price);

  return { ...po, emailPreviewUrl };
}

/**
 * Approve a Purchase Order
 */
async function approvePO(poId, userId, orgId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { vendor: true, purchaseRequest: true }
  });

  if (!po || po.organizationId !== orgId) {
    throw new Error('Purchase Order not found');
  }

  if (po.status !== 'PENDING_APPROVAL') {
    throw new Error(`Cannot approve PO in "${po.status}" status`);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    }
  });

  logActivity(userId, 'approved', 'PurchaseOrder', poId, `Approved PO ${po.poNumber}`, orgId);

  // Start delivery tracking
  await prisma.delivery.updateMany({
    where: { purchaseOrderId: poId },
    data: {
      status: 'PROCESSING',
      estimatedArrival: po.expectedDelivery,
    }
  });

  return updated;
}

/**
 * Allowed PO status transitions (state machine)
 */
const PO_TRANSITIONS = {
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['SENT_TO_VENDOR', 'CANCELLED'],
  SENT_TO_VENDOR: ['CONFIRMED', 'IN_TRANSIT', 'CANCELLED'],
  CONFIRMED: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Map PO status -> matching delivery status (keeps both views in sync)
const PO_TO_DELIVERY_STATUS = {
  SENT_TO_VENDOR: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
};

/**
 * Update a PO's status through its allowed lifecycle transitions.
 * Keeps the delivery record and PR status in sync.
 */
async function updatePOStatus(poId, userId, orgId, newStatus) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { purchaseRequest: true, delivery: true },
  });

  if (!po || po.organizationId !== orgId) {
    throw new Error('Purchase Order not found');
  }

  const allowed = PO_TRANSITIONS[po.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition PO from "${po.status}" to "${newStatus}". ` +
      `Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`
    );
  }

  const data = { status: newStatus };
  if (newStatus === 'SENT_TO_VENDOR' && !po.sentAt) {
    data.sentAt = new Date();
  }

  const updated = await prisma.purchaseOrder.update({ where: { id: poId }, data });

  // Sync the delivery record
  if (PO_TO_DELIVERY_STATUS[newStatus]) {
    await prisma.delivery.updateMany({
      where: { purchaseOrderId: poId },
      data: {
        status: PO_TO_DELIVERY_STATUS[newStatus],
        ...(newStatus === 'DELIVERED' ? { actualArrival: new Date() } : {}),
      },
    });
  }

  // When delivered, mark the PR delivered + notify the requester
  if (newStatus === 'DELIVERED' && po.purchaseRequest) {
    if (po.purchaseRequest.status !== 'delivered') {
      await prisma.purchaseRequest.update({
        where: { id: po.purchaseRequestId },
        data: { status: 'delivered' },
      });
    }
    await createNotification({
      userId: po.purchaseRequest.userId,
      organizationId: orgId,
      type: 'status_change',
      title: '✅ Delivery Completed',
      message: `"${po.purchaseRequest.itemName}" has been delivered!`,
      link: `/pr/${po.purchaseRequestId}`,
    });
  }

  logActivity(userId, 'status_changed', 'PurchaseOrder', poId, `PO ${po.poNumber} status changed to ${newStatus}`, orgId);

  return updated;
}

/**
 * Get all POs for an organization
 */
async function getPurchaseOrders(orgId, filters = {}) {
  const where = { organizationId: orgId };

  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { poNumber: { contains: filters.search, mode: 'insensitive' } },
      { purchaseRequest: { itemName: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      purchaseRequest: { select: { itemName: true, category: true, quantity: true, unit: true } },
      vendor: { select: { name: true, email: true } },
      delivery: { select: { status: true, trackingNumber: true, estimatedArrival: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(filters.limit || 50, 200),
  });

  return orders;
}

/**
 * Get a single PO by ID
 */
async function getPOById(poId, orgId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      purchaseRequest: {
        include: {
          user: { select: { name: true, email: true } },
          quotes: { include: { vendor: true } },
        }
      },
      vendor: true,
      delivery: true,
    }
  });

  if (!po || po.organizationId !== orgId) {
    throw new Error('Purchase Order not found');
  }

  return po;
}

module.exports = {
  generatePONumber,
  createPO,
  approvePO,
  updatePOStatus,
  getPurchaseOrders,
  getPOById,
};
