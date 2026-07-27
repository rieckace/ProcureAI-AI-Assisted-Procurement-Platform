const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/auth');
const { sendInvitationEmail } = require('../services/emailService');
const { logActivity } = require('./activityLogs');
const logger = require('../lib/logger');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Authentication will fail.');
}

function generateToken(user, orgSlug) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name || '',
      organizationSlug: orgSlug || ''
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    organizationId: user.organizationId,
    organizationName: user.organization?.name || '',
    organizationSlug: user.organization?.slug || ''
  };
}

// POST /api/auth/register - Create a new organization with the user as admin
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, organizationName, organizationSlug } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, and a number' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create organization
    const orgName = organizationName || `${name}'s Organization`;
    const slug = organizationSlug || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + uuidv4().slice(0, 6);

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization slug already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
        email
      }
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        organizationId: org.id
      },
      include: { organization: true }
    });

    const token = generateToken(user, org.slug);

    res.status(201).json({
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    logger.error('auth.register', err);
    res.status(500).json({ error: 'Failed to register organization' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, organizationSlug } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // If organization slug is provided, verify the org exists first
    if (organizationSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: organizationSlug }
      });
      if (!org) {
        return res.status(400).json({ error: 'Organization not found. Please check the slug.' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If org slug provided, verify user belongs to that org
    if (organizationSlug && user.organization?.slug !== organizationSlug) {
      return res.status(401).json({ error: 'Invalid credentials for this organization' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user, user.organization?.slug);

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    logger.error('auth.login', err, { email });
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/org-by-slug/:slug — Look up organization by slug (public)
router.get('/org-by-slug/:slug', async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, name: true, slug: true }
    });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (err) {
    logger.error('auth.lookupOrg', err);
    res.status(500).json({ error: 'Failed to look up organization' });
  }
});

// GET /api/auth/orgs/search — Search organizations by name or slug (public, with caching)
router.get('/orgs/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q || q.length < 1) {
      return res.json({ organizations: [] });
    }

    const organizations = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, name: true, slug: true },
      take: 10,
      orderBy: { name: 'asc' }
    });

    res.json({ organizations });
  } catch (err) {
    logger.error('auth.searchOrgs', err);
    res.status(500).json({ error: 'Failed to search organizations' });
  }
});

// POST /api/auth/invite - Org admin invites user to their org
router.post('/invite', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const validRoles = ['manager', 'officer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.inviteToken.create({
      data: {
        token,
        email,
        role,
        expiresAt,
        organizationId: req.user.organizationId
      }
    });

    const { previewUrl } = await sendInvitationEmail(email, token, req.user.organizationName);

    logActivity(req.user.id, 'invited_user', 'User', null, `Invited ${email} as ${role}`, req.user.organizationId);

    res.json({
      message: 'Invitation sent successfully',
      etherealUrl: previewUrl
    });
  } catch (err) {
    logger.error('auth.invite', err);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// POST /api/auth/accept-invite/:token
router.post('/accept-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, and a number' });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    if (invite.used) {
      return res.status(400).json({ error: 'Invitation already used' });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: invite.email,
        password: hashedPassword,
        role: invite.role,
        organizationId: invite.organizationId
      },
      include: { organization: true }
    });

    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { used: true }
    });

    const jwtToken = generateToken(user, invite.organization?.slug);

    res.status(201).json({
      token: jwtToken,
      user: sanitizeUser(user)
    });
  } catch (err) {
    logger.error('auth.acceptInvite', err);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// GET /api/auth/users - List org users (admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId },
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true }
    });
    res.json(users);
  } catch (err) {
    logger.error('auth.getUsers', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/auth/profile - Update user profile (name, department, bio, avatarStyle, theme, notification prefs)
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { name, department, bio, avatarStyle, theme, notifyOnQuote, notifyOnPO, notifyOnStatus } = req.body;
    const data = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
      data.name = name.trim();
    }
    if (department !== undefined) data.department = department;
    if (bio !== undefined) data.bio = bio;

    if (avatarStyle !== undefined) {
      const validStyles = [
        'big-smile', 'adventurer', 'avataaars', 'thumbs', 'notionists',
        'bottts', 'big-ears', 'big-ears-neutral', 'croodles', 'croodles-neutral',
        'identicon', 'initials', 'micah', 'miniavs', 'open-peeps',
        'personas', 'pixel-art', 'rings', 'shapes'
      ];
      if (!validStyles.includes(avatarStyle)) {
        return res.status(400).json({ error: `Invalid style` });
      }
      data.avatarStyle = avatarStyle;
    }

    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ error: 'Theme must be light, dark, or system' });
      }
      data.theme = theme;
    }

    if (notifyOnQuote !== undefined) data.notifyOnQuote = Boolean(notifyOnQuote);
    if (notifyOnPO !== undefined) data.notifyOnPO = Boolean(notifyOnPO);
    if (notifyOnStatus !== undefined) data.notifyOnStatus = Boolean(notifyOnStatus);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true, name: true, email: true, role: true, department: true,
        bio: true, avatarStyle: true, theme: true,
        notifyOnQuote: true, notifyOnPO: true, notifyOnStatus: true,
        organizationId: true,
      }
    });

    res.json({ user });
  } catch (err) {
    logger.error('auth.updateProfile', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/auth/export-data - Export user's personal data (PRs, activity logs, profile)
router.get('/export-data', authenticate, async (req, res) => {
  try {
    const [prs, activityLogs, user] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where: { userId: req.user.id, organizationId: req.user.organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          quotes: {
            include: { vendor: { select: { name: true, email: true } } }
          }
        }
      }),
      prisma.activityLog.findMany({
        where: { userId: req.user.id, organizationId: req.user.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, name: true, email: true, role: true, department: true,
          bio: true, avatarStyle: true, theme: true,
          notifyOnQuote: true, notifyOnPO: true, notifyOnStatus: true,
          createdAt: true
        }
      })
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      profile: user,
      purchaseRequests: prs,
      recentActivity: activityLogs,
      summary: {
        totalRequests: prs.length,
        totalSpent: prs
          .filter(p => p.status === 'ordered' || p.status === 'delivered')
          .reduce((sum, p) => sum + p.budget, 0),
        statusBreakdown: prs.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    logger.error('auth.exportData', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GET /api/auth/org - Get current user's organization info
router.get('/org', authenticate, async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: {
        _count: { select: { users: true, vendors: true, purchaseRequests: true } }
      }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(org);
  } catch (err) {
    logger.error('auth.getOrg', err);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

module.exports = router;
