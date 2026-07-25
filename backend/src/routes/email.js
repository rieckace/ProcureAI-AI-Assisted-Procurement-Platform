const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { sendTestEmail } = require('../services/emailService');
const logger = require('../lib/logger');

// GET /api/email/test - Send test email and return preview URL
router.get('/test', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await sendTestEmail();
    res.json({
      message: 'Test email sent successfully',
      messageId: result.messageId,
      previewUrl: result.previewUrl
    });
  } catch (err) {
    logger.error('email.test', err);
    res.status(500).json({ error: 'Failed to send test email. Is MailDev running?' });
  }
});

module.exports = router;
