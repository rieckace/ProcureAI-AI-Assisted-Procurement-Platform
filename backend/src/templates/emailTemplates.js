/**
 * Email templates for ProcureAI
 */

function getBaseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">ProcureAI</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">AI-Powered Procurement System</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ProcureAI. All rights reserved.</p>
              <p style="color: #999; font-size: 11px; margin: 5px 0 0;">This is an automated message from ProcureAI.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Quote Request Email Template
 */
function getQuoteRequestTemplate(vendorName, pr, frontendUrl) {
  const content = `
    <h2 style="color: #1a73e8; margin: 0 0 20px;">📋 Quote Request</h2>
    <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Hello <strong>${vendorName}</strong>,</p>
    <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
      You have been invited to provide a quote for the following procurement request:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 120px;">Item Name</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${pr.itemName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Category</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px;">${pr.category}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Quantity</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px;">${pr.quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Budget</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">$${pr.budget.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Urgency</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; text-transform: capitalize;">${pr.urgency}</td>
      </tr>
      ${pr.justification ? `
      <tr>
        <td style="padding: 8px 12px; color: #666; font-size: 13px;">Justification</td>
        <td style="padding: 8px 12px; color: #333; font-size: 14px;">${pr.justification}</td>
      </tr>` : ''}
    </table>

    <p style="color: #555; font-size: 15px; margin: 0 0 15px; line-height: 1.6;">
      Please review the requirements and submit your best quote including pricing and delivery timeline.
    </p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${frontendUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">Submit Quote</a>
    </div>

    <p style="color: #999; font-size: 13px; margin: 20px 0 0; font-style: italic;">
      We look forward to your proposal. Please respond within 5 business days.
    </p>
  `;

  return getBaseTemplate(content);
}

/**
 * Purchase Order Email Template
 */
function getPurchaseOrderTemplate(vendorName, po, frontendUrl) {
  const content = `
    <h2 style="color: #1a73e8; margin: 0 0 20px;">📦 Purchase Order Confirmed</h2>
    <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Dear <strong>${vendorName}</strong>,</p>
    <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
      We are pleased to inform you that a purchase order has been issued for the following:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 120px;">Item Name</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${po.itemName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Quantity</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px;">${po.quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Total Price</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #1a73e8; font-size: 16px; font-weight: 600;">$${po.price.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Expected Delivery</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px;">Within ${po.deliveryDays} days</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #666; font-size: 13px;">Urgency</td>
        <td style="padding: 8px 12px; color: #333; font-size: 14px; text-transform: capitalize;">${po.urgency}</td>
      </tr>
    </table>

    <div style="background-color: #e8f5e9; border-radius: 6px; padding: 16px 20px; margin-bottom: 20px;">
      <p style="color: #2e7d32; font-size: 14px; margin: 0; font-weight: 500;">✓ Order confirmed and processing</p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${frontendUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 500;">View Order Details</a>
    </div>

    <p style="color: #555; font-size: 14px; margin: 20px 0 0; line-height: 1.6;">
      Please ensure delivery meets the expected timeline. Contact us if you have any questions regarding this order.
    </p>
  `;

  return getBaseTemplate(content);
}

/**
 * Invitation Email Template
 */
function getInvitationTemplate(userEmail, invitationLink, orgName) {
  const content = `
    <h2 style="color: #1a73e8; margin: 0 0 20px;">🎉 You're Invited!</h2>
    <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Hello,</p>
    <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
      You have been invited to join <strong>${orgName}</strong> on ProcureAI — the AI-powered procurement system.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 8px 12px; color: #666; font-size: 13px; width: 120px;">Email</td>
        <td style="padding: 8px 12px; color: #333; font-size: 14px;">${userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; color: #666; font-size: 13px;">Organization</td>
        <td style="padding: 8px 12px; color: #333; font-size: 14px;">${orgName}</td>
      </tr>
    </table>

    <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
      Click the button below to accept your invitation and set up your account. This invitation expires in 7 days.
    </p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${invitationLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 16px; font-weight: 500;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #999; font-size: 13px; margin: 20px 0 0;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${invitationLink}" target="_blank" rel="noopener noreferrer" style="color: #1a73e8; word-break: break-all;">${invitationLink}</a>
    </p>
  `;

  return getBaseTemplate(content);
}

/**
 * Vendor Quote Submission Email Template
 * Sent to vendors with a unique link to fill in their quote
 */
function getVendorQuoteEmailTemplate(vendorName, pr, quoteFormUrl, expiresAt) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const content = `
    <h2 style="color: #1a73e8; margin: 0 0 20px;">📋 Quote Request — Action Required</h2>
    <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Dear <strong>${vendorName}</strong>,</p>
    <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
      You have been invited to submit a quote for the following procurement request. Please review the details below and submit your proposal using the secure link.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 140px;">Item</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; font-weight: 500;">${pr.itemName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Category</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px;">${pr.category}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Quantity</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px;">${pr.quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Budget</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #1a73e8; font-size: 14px; font-weight: 600;">$${pr.budget.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Urgency</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333; font-size: 14px; text-transform: capitalize;">${pr.urgency}</td>
      </tr>
      ${pr.justification ? `
      <tr>
        <td style="padding: 8px 12px; color: #666; font-size: 13px;">Justification</td>
        <td style="padding: 8px 12px; color: #333; font-size: 14px;">${pr.justification}</td>
      </tr>` : ''}
    </table>

    <div style="background-color: #fff3e0; border-left: 4px solid #f9a825; border-radius: 4px; padding: 12px 16px; margin-bottom: 25px;">
      <p style="color: #e65100; font-size: 13px; margin: 0; font-weight: 500;">
        ⏰ Deadline: Please submit your quote by <strong>${expiryDate}</strong>.
      </p>
    </div>

    <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
      Click the button below to submit your price and delivery timeline. This is a secure, one-time link — no login required.
    </p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${quoteFormUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 16px; font-weight: 500;">
        Submit Your Quote
      </a>
    </div>

    <p style="color: #999; font-size: 13px; margin: 20px 0 0;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${quoteFormUrl}" target="_blank" rel="noopener noreferrer" style="color: #1a73e8; word-break: break-all;">${quoteFormUrl}</a>
    </p>
  `;

  return getBaseTemplate(content);
}

module.exports = {
  getQuoteRequestTemplate,
  getPurchaseOrderTemplate,
  getInvitationTemplate,
  getVendorQuoteEmailTemplate
};
