const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('./activityLogs');
const logger = require('../lib/logger');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/gif',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

router.get('/purchase-requests/:prId/attachments', authenticate, async (req, res) => {
  try {
    const pr = await prisma.purchaseRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const attachments = await prisma.attachment.findMany({
      where: { prId: req.params.prId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  } catch (err) {
    logger.error('attachments.list', err);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

router.post('/purchase-requests/:prId/attachments', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const pr = await prisma.purchaseRequest.findUnique({ where: { id: req.params.prId } });
    if (!pr || pr.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const created = await Promise.all(
      req.files.map(file =>
        prisma.attachment.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            prId: req.params.prId,
            userId: req.user.id,
            organizationId: req.user.organizationId,
          },
        })
      )
    );

    logActivity(req.user.id, 'uploaded', 'Attachment', req.params.prId, `Uploaded ${req.files.length} file(s) to PR`, req.user.organizationId);

    res.status(201).json(created);
  } catch (err) {
    logger.error('attachments.upload', err);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

router.get('/attachments/:attachmentId/download', authenticate, async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.attachmentId },
      include: { purchaseRequest: true }
    });
    if (!attachment || attachment.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = path.join(__dirname, '../../uploads', attachment.filename);
    res.download(filePath, attachment.originalName);
  } catch (err) {
    logger.error('attachments.download', err, { attachmentId: req.params.attachmentId });
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.delete('/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.attachmentId },
      include: { purchaseRequest: true }
    });
    if (!attachment || attachment.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const fs = require('fs');
    const filePath = path.join(__dirname, '../../uploads', attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.attachment.delete({ where: { id: req.params.attachmentId } });

    logActivity(req.user.id, 'deleted', 'Attachment', attachment.prId, `Deleted attachment: ${attachment.originalName}`, req.user.organizationId);

    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    logger.error('attachments.delete', err, { attachmentId: req.params.attachmentId });
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

module.exports = router;
