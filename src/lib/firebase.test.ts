/**
 * Firebase Client SDK Tests
 *
 * TDD Phase: RED - Tests verify Firebase client module exports.
 * These tests mock Firebase to avoid requiring real Firebase credentials.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase modules before importing
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  connectAuthEmulator: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

describe('Firebase Client SDK', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should export auth instance', async () => {
    const firebase = await import('./firebase');
    expect(firebase.auth).toBeDefined();
  });

  it('should export signInWithEmailAndPassword function', async () => {
    const firebase = await import('./firebase');
    expect(firebase.signInWithEmailAndPassword).toBeDefined();
    expect(typeof firebase.signInWithEmailAndPassword).toBe('function');
  });

  it('should export createUserWithEmailAndPassword function', async () => {
    const firebase = await import('./firebase');
    expect(firebase.createUserWithEmailAndPassword).toBeDefined();
    expect(typeof firebase.createUserWithEmailAndPassword).toBe('function');
  });

  it('should export signOut function', async () => {
    const firebase = await import('./firebase');
    expect(firebase.signOut).toBeDefined();
    expect(typeof firebase.signOut).toBe('function');
  });

  it('should export onAuthStateChanged function', async () => {
    const firebase = await import('./firebase');
    expect(firebase.onAuthStateChanged).toBeDefined();
    expect(typeof firebase.onAuthStateChanged).toBe('function');
  });

  it('should export updateProfile function', async () => {
    const firebase = await import('./firebase');
    expect(firebase.updateProfile).toBeDefined();
    expect(typeof firebase.updateProfile).toBe('function');
  });

  it('should export sendPasswordResetEmail function', async () => {
    const firebase = await import('./firebase');
    expect(firebase.sendPasswordResetEmail).toBeDefined();
    expect(typeof firebase.sendPasswordResetEmail).toBe('function');
  });
});
