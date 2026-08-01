const prisma = require('../lib/prisma');
const { logActivity } = require('../routes/activityLogs');
const { createNotification } = require('./notificationService');
const logger = require('../lib/logger');

/**
 * Create a delivery record for a PO
 */
async function createDelivery(poId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { purchaseRequest: true }
  });

  if (!po) throw new Error('Purchase Order not found');

  const delivery = await prisma.delivery.create({
    data: {
      purchaseOrderId: poId,
      status: 'PREPARING',
      estimatedArrival: po.expectedDelivery,
    }
  });

  return delivery;
}

/**
 * Update delivery status with tracking info
 */
async function updateDeliveryStatus(deliveryId, orgId, userId, status, trackingNumber) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      purchaseOrder: {
        include: { purchaseRequest: { include: { user: true } } }
      }
    }
  });

  if (!delivery || delivery.purchaseOrder.organizationId !== orgId) {
    throw new Error('Delivery not found');
  }

  const validStatuses = ['PREPARING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updateData = { status };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (status === 'DELIVERED') updateData.actualArrival = new Date();

  const updated = await prisma.delivery.update({
    where: { id: deliveryId },
    data: updateData,
  });

  // Sync the parent PO status with delivery progress — but only for POs that
  // are mid-lifecycle (never resurrect a CANCELLED/DELIVERED/PENDING PO).
  const poStatusMap = {
    SHIPPED: 'SENT_TO_VENDOR',
    IN_TRANSIT: 'IN_TRANSIT',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
  };
  const inProgressPOs = ['APPROVED', 'SENT_TO_VENDOR', 'CONFIRMED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
  const po = delivery.purchaseOrder;
  if (poStatusMap[status] && po && inProgressPOs.includes(po.status) && po.status !== poStatusMap[status]) {
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: poStatusMap[status] },
    });
  }

  // If delivered, update PR status and deduct inventory
  if (status === 'DELIVERED') {
    await prisma.purchaseRequest.update({
      where: { id: delivery.purchaseOrder.purchaseRequestId },
      data: { status: 'delivered' }
    });

    // Notify the requester
    const pr = delivery.purchaseOrder.purchaseRequest;
    if (pr.user) {
      await createNotification({
        userId: pr.user.id,
        organizationId: orgId,
        type: 'status_change',
        title: '✅ Delivery Completed',
        message: `"${pr.itemName}" has been delivered!`,
        link: `/pr/${pr.id}`,
      });
    }
  }

  logActivity(userId, 'delivery_updated', 'Delivery', deliveryId,
    `Delivery status updated to "${status}"${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}`,
    orgId
  );

  return updated;
}

/**
 * Get all deliveries for an organization
 */
async function getDeliveries(orgId, filters = {}) {
  const where = {
    purchaseOrder: { organizationId: orgId }
  };

  if (filters.status) where.status = filters.status;
  if (filters.overdue) {
    where.status = { notIn: ['DELIVERED', 'FAILED'] };
    where.estimatedArrival = { lt: new Date() };
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    include: {
      purchaseOrder: {
        include: {
          purchaseRequest: { select: { itemName: true, quantity: true } },
          vendor: { select: { name: true } },
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(filters.limit || 50, 200),
  });

  return deliveries;
}

/**
 * Get overdue deliveries
 */
async function getOverdueDeliveries(orgId) {
  return getDeliveries(orgId, { overdue: true });
}

/**
 * Get deliveries by status
 */
async function getDeliveriesByStatus(orgId, status) {
  return getDeliveries(orgId, { status });
}

module.exports = {
  createDelivery,
  updateDeliveryStatus,
  getDeliveries,
  getOverdueDeliveries,
  getDeliveriesByStatus,
};
