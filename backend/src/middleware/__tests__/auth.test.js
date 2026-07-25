const { describe, it, expect, beforeEach } = require('./test-setup');

// We need to require the middleware after setting JWT_SECRET
let authenticate, authorize;

function setup() {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt';
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
    it('should return 401 if no authorization header', () => {
      const req = { headers: {} };
      const res = mockResponse();
      const next = () => {};

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Access denied. No token provided.');
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      const req = { headers: { authorization: 'Basic token123' } };
      const res = mockResponse();
      const next = () => {};

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Access denied. No token provided.');
    });

    it('should return 401 if token is invalid', () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } };
      const res = mockResponse();
      const next = () => {};

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token.');
    });

    it('should call next() if token is valid', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'manager', organizationId: 'org-1' },
        'test-secret-key-for-jwt'
      );

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      authenticate(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-1');
      expect(req.user.email).toBe('test@test.com');
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
