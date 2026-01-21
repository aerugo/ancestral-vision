/**
 * Genkit Initialization Tests
 *
 * Tests for the Genkit AI framework initialization with provider abstraction.
 * Supports Google AI Studio (development) and Vertex AI (production).
 *
 * Invariants:
 * - INV-AI004: Genkit Provider Abstraction - Support Google AI Studio (dev) and Vertex AI (prod)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Type assertion helper for setting NODE_ENV in tests
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

describe('Genkit Initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset to original env
    Object.keys(process.env).forEach((key) => {
      delete (process.env as Record<string, string | undefined>)[key];
    });
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Selection (INV-AI004)', () => {
    it('should initialize Genkit with correct provider based on NODE_ENV', async () => {
      setEnv('NODE_ENV', 'development');
      setEnv('GOOGLE_AI_API_KEY', 'test-api-key');

      const { getAI } = await import('./genkit');

      const ai = getAI();

      expect(ai).toBeDefined();
      expect(typeof ai.generate).toBe('function');
    });

    it('should use Google AI Studio in development', async () => {
      setEnv('NODE_ENV', 'development');
      setEnv('GOOGLE_AI_API_KEY', 'test-api-key');

      const { getAI, getProviderName } = await import('./genkit');
      getAI(); // Initialize

      expect(getProviderName()).toBe('google-genai');
    });

    it('should use Vertex AI in production', async () => {
      setEnv('NODE_ENV', 'production');
      setEnv('GOOGLE_CLOUD_PROJECT', 'test-project');

      vi.resetModules();
      const { getAI, getProviderName } = await import('./genkit');
      getAI(); // Initialize

      expect(getProviderName()).toBe('vertexai');
    });

    it('should export ai instance for flow definitions', async () => {
      setEnv('NODE_ENV', 'development');
      setEnv('GOOGLE_AI_API_KEY', 'test-api-key');

      const { getAI } = await import('./genkit');
      const ai = getAI();

      // AI instance should have defineFlow method for creating flows
      expect(typeof ai.defineFlow).toBe('function');
    });

    it('should throw error when no API key in development', async () => {
      setEnv('NODE_ENV', 'development');
      setEnv('GOOGLE_AI_API_KEY', undefined);

      vi.resetModules();
      const { getAI } = await import('./genkit');

      expect(() => getAI()).toThrow(/GOOGLE_AI_API_KEY/);
    });

    it('should throw error when no project ID in production', async () => {
      setEnv('NODE_ENV', 'production');
      setEnv('GOOGLE_CLOUD_PROJECT', undefined);

      vi.resetModules();
      const { getAI } = await import('./genkit');

      expect(() => getAI()).toThrow(/GOOGLE_CLOUD_PROJECT/);
    });
  });

  describe('Default Model Selection', () => {
    it('should default to gemini-3-pro-preview model with provider prefix', async () => {
      setEnv('NODE_ENV', 'development');
      setEnv('GOOGLE_AI_API_KEY', 'test-api-key');

      const { getDefaultModel } = await import('./genkit');

      expect(getDefaultModel()).toBe('googleai/gemini-3-pro-preview');
    });

    it('should allow overriding default model via environment', async () => {
      setEnv('NODE_ENV', 'development');
      setEnv('GOOGLE_AI_API_KEY', 'test-api-key');
      setEnv('GENKIT_DEFAULT_MODEL', 'gemini-custom');

      vi.resetModules();
      const { getDefaultModel } = await import('./genkit');

      expect(getDefaultModel()).toBe('gemini-custom');
    });
  });
});
