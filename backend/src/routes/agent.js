const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const autonomousAgent = require('../services/autonomousAgent');
const logger = require('../lib/logger');

// POST /api/agent/process - Trigger autonomous procurement pipeline
router.post('/process', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const result = await autonomousAgent.processRequest(
      message.trim(),
      req.user.id,
      req.user.organizationId
    );

    res.json(result);
  } catch (err) {
    logger.error('agent.process', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/agent/approve/:pipelineId - Approve agent recommendation
router.post('/approve/:pipelineId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const result = await autonomousAgent.approveRecommendation(
      req.params.pipelineId,
      req.user.id,
      req.user.organizationId
    );
    res.json(result);
  } catch (err) {
    logger.error('agent.approve', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/agent/reject/:pipelineId - Reject agent recommendation
router.post('/reject/:pipelineId', authenticate, authorize('officer', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await autonomousAgent.rejectRecommendation(
      req.params.pipelineId,
      req.user.id,
      req.user.organizationId,
      reason
    );
    res.json(result);
  } catch (err) {
    logger.error('agent.reject', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/agent/status/:pipelineId - Get pipeline status
router.get('/status/:pipelineId', authenticate, async (req, res) => {
  try {
    const pipeline = await autonomousAgent.getPipelineStatus(
      req.params.pipelineId,
      req.user.organizationId
    );
    res.json(pipeline);
  } catch (err) {
    if (err.message === 'Pipeline not found') {
      return res.status(404).json({ error: err.message });
    }
    logger.error('agent.status', err);
    res.status(500).json({ error: 'Failed to get pipeline status' });
  }
});

// GET /api/agent/history - Get agent pipeline history
router.get('/history', authenticate, async (req, res) => {
  try {
    const pipelines = await autonomousAgent.getPipelineHistory(
      req.user.organizationId,
      parseInt(req.query.limit) || 20
    );
    res.json({ data: pipelines, count: pipelines.length });
  } catch (err) {
    logger.error('agent.history', err);
    res.status(500).json({ error: 'Failed to get pipeline history' });
  }
});

// SSE endpoint for real-time pipeline updates
router.get('/stream/:pipelineId', authenticate, async (req, res) => {
  const pipelineId = req.params.pipelineId;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', pipelineId })}\n\n`);

  // Poll for pipeline updates every 3 seconds
  const interval = setInterval(async () => {
    try {
      const pipeline = await autonomousAgent.getPipelineStatus(pipelineId, req.user.organizationId);
      res.write(`data: ${JSON.stringify({
        type: 'pipeline_update',
        status: pipeline.status,
        currentStep: pipeline.currentStep,
        stepsCompleted: pipeline.stepsCompleted,
      })}\n\n`);

      if (pipeline.status === 'COMPLETED' || pipeline.status === 'FAILED' || pipeline.status === 'REJECTED') {
        clearInterval(interval);
        res.write(`data: ${JSON.stringify({ type: 'pipeline_final', status: pipeline.status })}\n\n`);
        res.end();
      }
    } catch {
      clearInterval(interval);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Pipeline not found' })}\n\n`);
      res.end();
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;
