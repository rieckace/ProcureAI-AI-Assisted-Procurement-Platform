const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  process.exit(1);
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded = null;
  try {
    decoded = jwt.verify(token, JWT_SECRET);

    // A JWT is self-contained, so a token issued before a DB reset/reseed
    // (e.g. `docker compose down -v` + fresh seed) would otherwise pass
    // signature verification while pointing at a user/org that no longer
    // exists — silently returning empty data everywhere. Validate the user
    // against the database and reject stale tokens with a clean 401.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, organizationId: true },
    });

    if (!user || user.organizationId !== decoded.organizationId) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Merge fresh DB fields (name/role may have changed) with token claims
    // that aren't stored on the User model (organizationName, organizationSlug).
    req.user = { ...decoded, ...user };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    // Any other failure here is an infrastructure/DB problem, not an auth
    // failure — don't pretend it's a bad token.
    logger.error && logger.error('auth.verify', err.message, { userId: decoded && decoded.id });
    return res.status(500).json({ error: 'Authentication service unavailable. Please try again later.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
