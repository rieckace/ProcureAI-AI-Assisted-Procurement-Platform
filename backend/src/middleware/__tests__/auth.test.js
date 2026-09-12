const { describe, it, expect, beforeEach } = require('./test-setup');

// We need to require the middleware after setting JWT_SECRET
let authenticate, authorize;

// Mock prisma so the middleware's DB lookup works without a real database
const prismaPath = require.resolve('../../lib/prisma');

const mockUsers = {
  'user-1': { id: 'user-1', name: 'Test', email: 'test@test.com', role: 'manager', organizationId: 'org-1' },
  'user-2': { id: 'user-2', name: 'Other', email: 'other@test.com', role: 'officer', organizationId: 'org-2' },
};

const mockPrisma = {
  user: {
    findUnique: async ({ where }) => mockUsers[where.id] || null,
  },
};

function setup() {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt';
  // Inject the mocked prisma into the require cache before loading auth
  delete require.cache[prismaPath];
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: mockPrisma,
  };
  delete require.cache[require.resolve('../auth')];
  const auth = require('../auth');
  authenticate = auth.authenticate;
  authorize = auth.authorize;
}

function mockResponse() {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    setup();
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header', async () => {
      const req = { headers: {} };
      const res = mockResponse();
      const next = () => {};

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Access denied. No token provided.');
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      const req = { headers: { authorization: 'Basic token123' } };
      const res = mockResponse();
      const next = () => {};

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Access denied. No token provided.');
    });

    it('should return 401 if token is invalid', async () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } };
      const res = mockResponse();
      const next = () => {};

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token.');
    });

    it('should return 401 if user no longer exists in the database (stale token)', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 'deleted-user', email: 'gone@test.com', name: 'Gone', role: 'admin', organizationId: 'org-1' },
        'test-secret-key-for-jwt'
      );

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token.');
      expect(nextCalled).toBe(false);
    });

    it('should return 401 if token organization does not match the database (stale org)', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'manager', organizationId: 'org-999' },
        'test-secret-key-for-jwt'
      );

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token.');
      expect(nextCalled).toBe(false);
    });

    it('should call next() if token is valid and user exists', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'manager', organizationId: 'org-1' },
        'test-secret-key-for-jwt'
      );

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await authenticate(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-1');
      expect(req.user.email).toBe('test@test.com');
      expect(req.user.organizationId).toBe('org-1');
    });

    it('should refresh user data from the database onto req.user', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 'user-2', email: 'stale-email@test.com', name: 'Stale', role: 'admin', organizationId: 'org-2' },
        'test-secret-key-for-jwt'
      );

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await authenticate(req, res, next);

      expect(nextCalled).toBe(true);
      // Fresh DB values win over stale token claims
      expect(req.user.name).toBe('Other');
      expect(req.user.email).toBe('other@test.com');
      expect(req.user.role).toBe('officer');
    });
  });

  describe('authorize', () => {
    it('should return 403 if user role is not in allowed roles', () => {
      const req = { user: { role: 'manager' } };
      const res = mockResponse();
      const next = () => {};

      const authorizeAdmin = authorize('admin');
      authorizeAdmin(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should call next() if user role is in allowed roles', () => {
      const req = { user: { role: 'admin' } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const authorizeAdmin = authorize('admin', 'officer');
      authorizeAdmin(req, res, next);

      expect(nextCalled).toBe(true);
    });

    it('should call next() for officer role when officer is allowed', () => {
      const req = { user: { role: 'officer' } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const authorizeOfficer = authorize('officer', 'admin');
      authorizeOfficer(req, res, next);

      expect(nextCalled).toBe(true);
    });
  });
});
