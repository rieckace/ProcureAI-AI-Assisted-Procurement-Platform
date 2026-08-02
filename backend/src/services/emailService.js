const nodemailer = require('nodemailer');
const { getQuoteRequestTemplate, getPurchaseOrderTemplate, getInvitationTemplate, getVendorQuoteEmailTemplate } = require('../templates/emailTemplates');
const logger = require('../lib/logger');

let transporter = null;
let transporterReady = false;

/**
 * Create a local SMTP transporter using MailDev
 * MailDev runs on SMTP_HOST:SMTP_PORT (default localhost:1025)
 * and its web UI on MAILDEV_URL (default http://localhost:1080)
 */
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);

async function initTransporter() {
  if (transporterReady) return transporter;

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 3000,
    });

    // Verify the connection actually works
    await transporter.verify();
    transporterReady = true;
    logger.info('emailService.initMailDev', `MailDev transporter initialized on ${SMTP_HOST}:${SMTP_PORT}`);
    return transporter;
  } catch (err) {
    logger.warn('emailService.initMailDev', `MailDev not available (${err.message}). Emails will be logged but not sent.`);
    // Return a stub transporter that logs instead of sending
    transporter = {
      sendMail: async (opts) => {
        logger.info('emailService.stub', 'Email not sent (MailDev unavailable)', { to: opts.to, subject: opts.subject });
        return { messageId: 'stub-' + Date.now(), previewUrl: null };
      },
      verify: async () => true,
    };
    transporterReady = true;
    return transporter;
  }
}

/**
 * Get MailDev web UI URL to view sent emails
 */
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const MAILDEV_URL = process.env.MAILDEV_URL || 'http://localhost:1080';

function getEmailPreviewUrl() {
  return MAILDEV_URL;
}

/**
 * Send email using MailDev transporter
 */
async function sendEmail({ to, subject, html }) {
  const transport = await initTransporter();

  const info = await transport.sendMail({
    from: '"ProcureAI" <noreply@procureai.com>',
    to,
    subject,
    html
  });

  const previewUrl = getEmailPreviewUrl();
  logger.info('emailService.sendEmail', `Email sent: ${info.messageId}`, { to, subject, previewUrl });

  return { messageId: info.messageId, previewUrl };
}

/**
 * Send quote request email to vendor
 */
async function sendQuoteRequestEmail(vendorEmail, vendorName, prDetails) {
  const subject = `📋 Quote Request: ${prDetails.itemName}`;
  const html = getQuoteRequestTemplate(vendorName, prDetails, FRONTEND_URL);
  return sendEmail({ to: vendorEmail, subject, html });
}

/**
 * Send purchase order email to vendor
 */
async function sendPurchaseOrderEmail(vendorEmail, vendorName, poDetails) {
  const subject = `📦 Purchase Order: ${poDetails.itemName}`;
  const html = getPurchaseOrderTemplate(vendorName, poDetails, FRONTEND_URL);
  return sendEmail({ to: vendorEmail, subject, html });
}

/**
 * Send invitation email to new user
 */
async function sendInvitationEmail(userEmail, token, orgName) {
  const subject = `🎉 You're Invited to ${orgName || 'ProcureAI'}`;
  const invitationLink = `${FRONTEND_URL}/accept-invite/${token}`;
  const html = getInvitationTemplate(userEmail, invitationLink, orgName || 'ProcureAI');
  return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send vendor quote submission email with unique form link
 */
async function sendVendorQuoteEmail(vendorEmail, vendorName, prDetails, quoteFormUrl, expiresAt) {
  const subject = `📋 Quote Request: ${prDetails.itemName} — Submit Your Proposal`;
  const html = getVendorQuoteEmailTemplate(vendorName, prDetails, quoteFormUrl, expiresAt);
  return sendEmail({ to: vendorEmail, subject, html });
}

/**
 * Send test email to verify setup
 */
async function sendTestEmail() {
  const transport = await initTransporter();

  const info = await transport.sendMail({
    from: '"ProcureAI" <noreply@procureai.com>',
    to: 'test@example.com',
    subject: '🧪 ProcureAI Test Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a73e8;">ProcureAI Test Email</h1>
        <p>This is a test email to verify that the email service is working correctly.</p>
        <p>If you're seeing this, your email configuration is set up properly!</p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Sent from ProcureAI - AI Procurement System</p>
      </div>
    `
  });

  const previewUrl = getEmailPreviewUrl();
  return { messageId: info.messageId, previewUrl };
}

module.exports = {
  initTransporter,
  sendEmail,
  sendQuoteRequestEmail,
  sendPurchaseOrderEmail,
  sendInvitationEmail,
  sendVendorQuoteEmail,
  sendTestEmail,
  getEmailPreviewUrl
};
