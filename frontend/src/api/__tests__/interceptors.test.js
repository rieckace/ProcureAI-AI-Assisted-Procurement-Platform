import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const originalLocation = window.location;
delete window.location;
window.location = { ...originalLocation, pathname: '/', href: '' };

describe('API Interceptors', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    window.location.pathname = '/';
    window.location.href = '';
  });

  it('should add Authorization header when token exists', async () => {
    localStorageMock.setItem('token', 'test-jwt-token');
    localStorageMock.setItem('user', JSON.stringify({ name: 'Test User' }));

    const api = (await import('../index')).default;

    // Simulate a request interceptor
    const config = { headers: {} };
    const interceptedConfig = api.interceptors.request.handlers[0].fulfilled(config);

    expect(interceptedConfig.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not add Authorization header when no token', async () => {
    const api = (await import('../index')).default;

    const config = { headers: {} };
    const interceptedConfig = api.interceptors.request.handlers[0].fulfilled(config);

    expect(interceptedConfig.headers.Authorization).toBeUndefined();
  });

  it('should redirect to login on 401 response', async () => {
    localStorageMock.setItem('token', 'expired-token');
    localStorageMock.setItem('user', JSON.stringify({ name: 'Test User' }));
    window.location.pathname = '/officer-dashboard';

    const api = (await import('../index')).default;

    const errorResponse = {
      response: { status: 401 },
      config: {},
    };

    await expect(
      api.interceptors.response.handlers[0].rejected(errorResponse)
    ).rejects.toEqual(errorResponse);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    expect(window.location.href).toBe('/login');
  });

  it('should NOT redirect to login on 401 if already on login page', async () => {
    localStorageMock.setItem('token', 'expired-token');
    window.location.pathname = '/login';

    const api = (await import('../index')).default;

    const errorResponse = {
      response: { status: 401 },
      config: {},
    };

    await expect(
      api.interceptors.response.handlers[0].rejected(errorResponse)
    ).rejects.toEqual(errorResponse);

    // Should not redirect since we're already on login
    expect(window.location.href).not.toBe('/login');
  });

  it('should pass through non-401 errors', async () => {
    const api = (await import('../index')).default;

    const errorResponse = {
      response: { status: 500 },
      message: 'Server error',
    };

    await expect(
      api.interceptors.response.handlers[0].rejected(errorResponse)
    ).rejects.toEqual(errorResponse);

    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });
});
