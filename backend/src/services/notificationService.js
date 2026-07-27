const prisma = require('../lib/prisma');
const { sendEmail } = require('./emailService');
const logger = require('../lib/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Create an in-app notification for a specific user.
 */
async function createNotification({ userId, organizationId, type, title, message, link }) {
  try {
    // Check if user has this notification type enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyOnQuote: true, notifyOnPO: true, notifyOnStatus: true }
    });
    if (!user) return;

    // Respect notification preferences
    if (type === 'new_quote' && !user.notifyOnQuote) return;
    if (type === 'po_issued' && !user.notifyOnPO) return;
    if ((type === 'status_change' || type === 'comment_added') && !user.notifyOnStatus) return;

    await prisma.notification.create({
      data: { userId, organizationId, type, title, message: message || '', link }
    });
  } catch (err) {
    logger.error('notifications.create', err.message, { userId, type });
  }
}

/**
 * Create notifications for all users in a role within an organization.
 */
async function createNotificationForRole({ organizationId, role, type, title, message, link, excludeUserId }) {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId, role, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true }
    });
    for (const u of users) {
      await createNotification({ userId: u.id, organizationId, type, title, message, link });
    }
  } catch (err) {
    logger.error('notifications.createForRole', err.message, { organizationId, role, type });
  }
}

/**
 * Notify the PR requester about a status change.
 */
async function notifyStatusChange(prId, newStatus, changedBy) {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: { user: true }
    });
    if (!pr || !pr.user) return;

    const user = pr.user;
    const statusEmojis = {
      quoted: '📋',
      ordered: '📦',
      delivered: '✅',
      pending: '⏳',
    };

    // Create in-app notification
    await createNotification({
      userId: user.id,
      organizationId: pr.organizationId,
      type: 'status_change',
      title: `${statusEmojis[newStatus] || '🔄'} PR Status Updated`,
      message: `"${pr.itemName}" changed to "${newStatus}" by ${changedBy}`,
      link: `/pr/${prId}`,
    });

    // Also notify officers when a PR is created/changed
    if (newStatus === 'pending') {
      await createNotificationForRole({
        organizationId: pr.organizationId,
        role: 'officer',
        type: 'status_change',
        title: `📝 New PR: ${pr.itemName}`,
        message: `${user.name} created a purchase request for "${pr.itemName}"`,
        link: `/pr/${prId}`,
      });
    }

    // Send email
    const subject = `${statusEmojis[newStatus] || '🔄'} PR Status Update: ${pr.itemName} → ${newStatus}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); padding: 30px 40px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ProcureAI</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">Status Update</p>
        </div>
        <div style="background: #ffffff; padding: 30px 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a73e8; margin: 0 0 20px;">${statusEmojis[newStatus]} Status Changed</h2>
          <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
            The status of your purchase request has been updated by <strong>${changedBy}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 120px;">Item</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${pr.itemName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">New Status</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #1a73e8; font-size: 14px; font-weight: 600; text-transform: capitalize;">${newStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #666; font-size: 13px;">Category</td>
              <td style="padding: 8px 12px; color: #333; font-size: 14px;">${pr.category}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${FRONTEND_URL}/pr/${prId}" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">View Request</a>
          </div>
          <p style="color: #999; font-size: 12px; margin: 20px 0 0;">This is an automated notification from ProcureAI.</p>
        </div>
      </div>
    `;

    await sendEmail({ to: user.email, subject, html });
    logger.info('notifications.statusChange', `Email sent to ${user.email}`, { prId, newStatus });
  } catch (err) {
    logger.error('notifications.statusChange', err.message, { prId });
  }
}

/**
 * Notify the PR requester when a new quote is received.
 */
async function notifyQuoteReceived(prId, vendorName, price) {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: { user: true }
    });
    if (!pr || !pr.user) return;

    const user = pr.user;

    // Create in-app notification for the PR requester
    await createNotification({
      userId: user.id,
      organizationId: pr.organizationId,
      type: 'new_quote',
      title: `💰 New Quote: ${vendorName}`,
      message: `${vendorName} quoted $${price?.toLocaleString() || 'N/A'} for "${pr.itemName}"`,
      link: `/pr/${prId}`,
    });

    // Notify all officers too
    await createNotificationForRole({
      organizationId: pr.organizationId,
      role: 'officer',
      type: 'new_quote',
      title: `💰 New Quote from ${vendorName}`,
      message: `${vendorName} quoted $${price?.toLocaleString() || 'N/A'} for "${pr.itemName}"`,
      link: `/pr/${prId}`,
      excludeUserId: user.id,
    });

    // Send email
    const subject = `💰 New Quote Received: ${vendorName} quoted $${price} for ${pr.itemName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #34a853 0%, #2e7d32 100%); padding: 30px 40px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ProcureAI</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">Quote Received</p>
        </div>
        <div style="background: #ffffff; padding: 30px 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #34a853; margin: 0 0 20px;">💰 New Quote Received!</h2>
          <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
            A new quote has been submitted for your purchase request.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 120px;">Item</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${pr.itemName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Vendor</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${vendorName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Price</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #34a853; font-size: 16px; font-weight: 600;">$${price?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #666; font-size: 13px;">Budget</td>
              <td style="padding: 8px 12px; color: #333; font-size: 14px;">$${pr.budget.toLocaleString()}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${FRONTEND_URL}/pr/${prId}" style="display: inline-block; background-color: #34a853; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">View Quote</a>
          </div>
          <p style="color: #999; font-size: 12px; margin: 20px 0 0;">This is an automated notification from ProcureAI.</p>
        </div>
      </div>
    `;

    await sendEmail({ to: user.email, subject, html });
    logger.info('notifications.quoteReceived', `Email sent to ${user.email}`, { prId, vendorName });
  } catch (err) {
    logger.error('notifications.quoteReceived', err.message, { prId });
  }
}

/**
 * Notify the PR requester when a PO is issued.
 */
async function notifyPOIssued(prId, vendorName, price) {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: { user: true }
    });
    if (!pr || !pr.user) return;

    const user = pr.user;

    // Create in-app notification
    await createNotification({
      userId: user.id,
      organizationId: pr.organizationId,
      type: 'po_issued',
      title: `📦 PO Issued: ${pr.itemName}`,
      message: `Purchase Order issued to ${vendorName} for $${price?.toLocaleString() || 'N/A'}`,
      link: `/pr/${prId}`,
    });

    // Send email
    const subject = `📦 Purchase Order Issued: ${pr.itemName} → ${vendorName} ($${price})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fbbc04 0%, #f57c00 100%); padding: 30px 40px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ProcureAI</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">Purchase Order Issued</p>
        </div>
        <div style="background: #ffffff; padding: 30px 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #f57c00; margin: 0 0 20px;">📦 Purchase Order Issued!</h2>
          <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
            A purchase order has been issued for your request.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 120px;">Item</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${pr.itemName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Vendor</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${vendorName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Total</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #f57c00; font-size: 16px; font-weight: 600;">$${price?.toLocaleString()}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${FRONTEND_URL}/pr/${prId}" style="display: inline-block; background-color: #f57c00; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">View Order</a>
          </div>
          <p style="color: #999; font-size: 12px; margin: 20px 0 0;">This is an automated notification from ProcureAI.</p>
        </div>
      </div>
    `;

    await sendEmail({ to: user.email, subject, html });
    logger.info('notifications.poIssued', `Email sent to ${user.email}`, { prId, vendorName });
  } catch (err) {
    logger.error('notifications.poIssued', err.message, { prId });
  }
}

module.exports = {
  createNotification,
  createNotificationForRole,
  notifyStatusChange,
  notifyQuoteReceived,
  notifyPOIssued,
};
