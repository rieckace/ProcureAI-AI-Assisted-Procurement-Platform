const nodemailer = require('nodemailer');
const { getQuoteRequestTemplate, getPurchaseOrderTemplate, getInvitationTemplate } = require('../templates/emailTemplates');
const logger = require('../lib/logger');

let transporter = null;

/**
 * Create a local SMTP transporter using MailDev
 * MailDev runs on localhost:1025 (SMTP) and localhost:1080 (Web UI)
 */
async function initTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false,
    ignoreTLS: true
  });

  logger.info('emailService.initMailDev', 'MailDev transporter initialized on localhost:1025');

  return transporter;
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
  sendTestEmail,
  getEmailPreviewUrl
};
