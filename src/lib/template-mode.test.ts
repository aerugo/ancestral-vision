/**
 * Template Mode Detection Tests
 *
 * Unit tests for template mode detection and mock user generation.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('template-mode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isTemplateMode', () => {
    it('should return true when NEXT_PUBLIC_TEMPLATE_MODE is "true"', async () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'true';
      process.env.NODE_ENV = 'development';

      const { isTemplateMode } = await import('./template-mode');
      expect(isTemplateMode()).toBe(true);
    });

    it('should return false when NEXT_PUBLIC_TEMPLATE_MODE is not set', async () => {
      delete process.env.NEXT_PUBLIC_TEMPLATE_MODE;
      process.env.NODE_ENV = 'development';

      const { isTemplateMode } = await import('./template-mode');
      expect(isTemplateMode()).toBe(false);
    });

    it('should return false in production even if NEXT_PUBLIC_TEMPLATE_MODE is set', async () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'true';
      process.env.NODE_ENV = 'production';

      const { isTemplateMode } = await import('./template-mode');
      expect(isTemplateMode()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_TEMPLATE_MODE is "false"', async () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'false';
      process.env.NODE_ENV = 'development';

      const { isTemplateMode } = await import('./template-mode');
      expect(isTemplateMode()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_TEMPLATE_MODE is empty string', async () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = '';
      process.env.NODE_ENV = 'development';

      const { isTemplateMode } = await import('./template-mode');
      expect(isTemplateMode()).toBe(false);
    });
  });

  describe('getTemplateUser', () => {
    it('should return template user object with correct fields', async () => {
      const { getTemplateUser, TEMPLATE_USER_ID } = await import('./template-mode');
      const user = getTemplateUser();

      expect(user).toEqual({
        uid: TEMPLATE_USER_ID,
        email: 'template@ancestralvision.dev',
        displayName: 'Template Person',
      });
    });

    it('should use the exported TEMPLATE_USER_ID constant', async () => {
      const { getTemplateUser, TEMPLATE_USER_ID } = await import('./template-mode');
      const user = getTemplateUser();

      expect(user.uid).toBe(TEMPLATE_USER_ID);
      expect(TEMPLATE_USER_ID).toBe('template-user');
    });
  });

  describe('getTemplateToken', () => {
    it('should return a mock token string', async () => {
      const { getTemplateToken } = await import('./template-mode');
      const token = getTemplateToken();

      expect(token).toBe('template-mode-token');
    });

    it('should return the same token every time', async () => {
      const { getTemplateToken } = await import('./template-mode');
      const token1 = getTemplateToken();
      const token2 = getTemplateToken();

      expect(token1).toBe(token2);
    });
  });
});
