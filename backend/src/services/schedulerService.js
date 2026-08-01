/**
 * Background Job Scheduler
 * 
 * Uses node-cron for lightweight scheduling without external infrastructure.
 * Runs checks daily and periodically for:
 * - Low inventory alerts
 * - Overdue delivery reminders
 * - Pending approvals older than 24 hours
 */

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { createNotification, createNotificationForRole } = require('./notificationService');
const logger = require('../lib/logger');

let initialized = false;

/**
 * Check whether an identical notification was already sent for this org
 * within the last 24 hours (avoids duplicate alert spam).
 */
async function recentlyNotified(organizationId, title) {
  const existing = await prisma.notification.findFirst({
    where: {
      organizationId,
      title,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  return !!existing;
}

/**
 * Check all organizations for low stock items
 */
async function checkLowInventory() {
  try {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });

    for (const org of orgs) {
      const allItems = await prisma.inventory.findMany({
        where: { organizationId: org.id }
      });
      const lowStockItems = allItems.filter(item => item.quantity <= item.minStockLevel);

      if (lowStockItems.length === 0) continue;

      // Notify all officers in this org (deduplicated per item)
      for (const item of lowStockItems) {
        const title = `⚠️ Low Stock Alert: ${item.itemName}`;
        if (await recentlyNotified(org.id, title)) continue;

        await createNotificationForRole({
          organizationId: org.id,
          role: 'officer',
          type: 'status_change',
          title,
          message: `"${item.itemName}" is at ${item.quantity} units (minimum: ${item.minStockLevel}). Consider reordering.`,
          link: '/inventory',
        });
      }

      logger.info('scheduler.lowInventory', `Notified about ${lowStockItems.length} low stock items in ${org.name}`);
    }
  } catch (err) {
    logger.error('scheduler.lowInventory', err.message);
  }
}

/**
 * Check for overdue deliveries across all orgs
 */
async function checkOverdueDeliveries() {
  try {
    const overdueDeliveries = await prisma.delivery.findMany({
      where: {
        status: { notIn: ['DELIVERED', 'FAILED'] },
        estimatedArrival: { lt: new Date() },
      },
      include: {
        purchaseOrder: {
          include: {
            organization: { select: { id: true } },
            purchaseRequest: { select: { itemName: true, userId: true } },
          }
        }
      }
    });

    for (const delivery of overdueDeliveries) {
      const po = delivery.purchaseOrder;
      const orgId = po.organization.id;
      const itemName = po.purchaseRequest.itemName;
      const title = `⚠️ Delivery Overdue: ${itemName}`;

      // Deduplicate per delivery (title must match what we store below)
      if (await recentlyNotified(orgId, title)) continue;

      // Notify the requester
      await createNotification({
        userId: po.purchaseRequest.userId,
        organizationId: orgId,
        type: 'status_change',
        title,
        message: `"${itemName}" was expected by ${new Date(delivery.estimatedArrival).toLocaleDateString()} but hasn't arrived yet.`,
        link: `/pr/${po.purchaseRequestId}`,
      });

      // Notify officers
      await createNotificationForRole({
        organizationId: orgId,
        role: 'officer',
        type: 'status_change',
        title,
        message: `Delivery for "${itemName}" is overdue. Expected: ${new Date(delivery.estimatedArrival).toLocaleDateString()}`,
        link: `/pr/${po.purchaseRequestId}`,
      });
    }

    if (overdueDeliveries.length > 0) {
      logger.info('scheduler.overdueDeliveries', `Found ${overdueDeliveries.length} overdue delivery(ies)`);
    }
  } catch (err) {
    logger.error('scheduler.overdueDeliveries', err.message);
  }
}

/**
 * Check for pending approvals older than 24 hours
 */
async function checkPendingApprovals() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stalePipelines = await prisma.procurementPipeline.findMany({
      where: {
        status: 'AWAITING_APPROVAL',
        updatedAt: { lt: oneDayAgo },
      },
      include: {
        organization: { select: { id: true } },
        purchaseRequest: { select: { itemName: true } },
        user: { select: { name: true } },
      }
    });

    for (const pipeline of stalePipelines) {
      const title = `⏰ Pending Approval Reminder: ${pipeline.purchaseRequest?.itemName || 'Unknown'}`;
      // Deduplicate per pipeline so stale requests aren't reminded every 4h
      if (await recentlyNotified(pipeline.organization.id, title)) continue;

      await createNotificationForRole({
        organizationId: pipeline.organization.id,
        role: 'officer',
        type: 'status_change',
        title,
        message: `Agent recommendation for "${pipeline.purchaseRequest?.itemName || 'Unknown'}" by ${pipeline.user?.name || 'Unknown'} has been waiting for approval for over 24 hours.`,
        link: `/pr/${pipeline.purchaseRequestId}`,
      });
    }

    if (stalePipelines.length > 0) {
      logger.info('scheduler.pendingApprovals', `Reminded about ${stalePipelines.length} stale pipeline(s)`);
    }
  } catch (err) {
    logger.error('scheduler.pendingApprovals', err.message);
  }
}

/**
 * Initialize all scheduled jobs
 */
function initScheduler() {
  if (initialized) return;
  initialized = true;

  // Run low inventory check daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    logger.info('scheduler', 'Running daily low inventory check...');
    checkLowInventory();
  });

  // Run overdue delivery check daily at 9:30 AM
  cron.schedule('30 9 * * *', () => {
    logger.info('scheduler', 'Running daily overdue delivery check...');
    checkOverdueDeliveries();
  });

  // Check for stale approvals every 4 hours
  cron.schedule('0 */4 * * *', () => {
    logger.info('scheduler', 'Running stale approval check...');
    checkPendingApprovals();
  });

  // Also run once on startup (after a 10-second delay)
  setTimeout(() => {
    logger.info('scheduler', 'Running initial startup checks...');
    checkLowInventory();
    checkOverdueDeliveries();
    checkPendingApprovals();
  }, 10000);

  logger.info('scheduler', 'All scheduled jobs registered.');
}

module.exports = {
  initScheduler,
  checkLowInventory,
  checkOverdueDeliveries,
  checkPendingApprovals,
};
