/**
 * Firebase Admin SDK Tests
 *
 * TDD Phase: RED - Tests verify Firebase Admin module exports.
 * These tests mock Firebase Admin to avoid requiring real credentials.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin modules before importing
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-admin-app' })),
  getApps: vi.fn(() => []),
  cert: vi.fn((config) => config),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

describe('Firebase Admin SDK', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export getFirebaseAdmin function', async () => {
    const adminModule = await import('./firebase-admin');
    expect(adminModule.getFirebaseAdmin).toBeDefined();
    expect(typeof adminModule.getFirebaseAdmin).toBe('function');
  });

  it('should return app and auth from getFirebaseAdmin', async () => {
    const adminModule = await import('./firebase-admin');
    const { app, auth } = adminModule.getFirebaseAdmin();

    expect(app).toBeDefined();
    expect(auth).toBeDefined();
  });

  it('should return same instance on multiple calls (singleton)', async () => {
    const adminModule = await import('./firebase-admin');

    const first = adminModule.getFirebaseAdmin();
    const second = adminModule.getFirebaseAdmin();

    expect(first.app).toBe(second.app);
    expect(first.auth).toBe(second.auth);
  });
});
