const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { processMessage } = require('../services/chatService');
const logger = require('../lib/logger');

// POST /api/chat — Send a message to Procura
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
    }

    const chatContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      userRole: req.user.role,
      userName: req.user.name,
      currentPage: context?.page || null,
    };

    const response = await processMessage(message.trim(), chatContext);

    res.json({
      message: response.message,
      fallback: response.fallback,
      suggestions: response.suggestions || [],
      navigate: response.navigate || null,
    });
  } catch (err) {
    logger.error('chat.processMessage', err);
    res.status(500).json({ error: 'Sorry, I encountered an error processing your message.' });
  }
});

// GET /api/chat/suggestions — Get default suggestions based on user role
router.get('/suggestions', authenticate, async (req, res) => {
  const roleSuggestions = {
    manager: [
      { text: 'Show my pending requests', action: 'query' },
      { text: 'How do I create a purchase request?', action: 'help' },
      { text: 'What does each status mean?', action: 'help' },
      { text: 'Walk me through the procurement process', action: 'help' },
      { text: 'How is vendor scoring calculated?', action: 'help' },
    ],
    officer: [
      { text: 'Show pending requests', action: 'query' },
      { text: 'Which PRs need quotes?', action: 'query' },
      { text: 'Find IT vendors', action: 'query' },
      { text: 'How do I add a quote?', action: 'help' },
      { text: 'Show recent activity', action: 'query' },
    ],
    admin: [
      { text: 'Show system overview', action: 'query' },
      { text: 'Recent activity', action: 'query' },
      { text: 'How do I invite users?', action: 'help' },
      { text: 'Show all pending requests', action: 'query' },
      { text: 'How is AI scoring done?', action: 'help' },
    ],
  };

  const suggestions = roleSuggestions[req.user.role] || roleSuggestions.manager;
  res.json({ suggestions, role: req.user.role, name: req.user.name });
});

module.exports = router;
