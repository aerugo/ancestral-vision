/**
 * Template Mode Utilities
 *
 * Detect and manage template mode for visual testing.
 * Template mode bypasses Firebase auth with a mock user.
 *
 * SECURITY: Template mode only works in development environment.
 */

/** Template user ID - matches seed-template.ts */
export const TEMPLATE_USER_ID = 'template-user';

const TEMPLATE_EMAIL = 'template@ancestralvision.dev';
const TEMPLATE_DISPLAY_NAME = 'Template Person';
const TEMPLATE_TOKEN = 'template-mode-token';

/**
 * Template user type for auth injection
 */
export interface TemplateUser {
  uid: string;
  email: string;
  displayName: string;
}

/**
 * Check if template mode is enabled
 *
 * Template mode is enabled when:
 * 1. NEXT_PUBLIC_TEMPLATE_MODE environment variable is "true"
 * 2. NODE_ENV is "development" (security guard)
 *
 * @returns true if template mode is active
 */
export function isTemplateMode(): boolean {
  // Security: Never allow template mode in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return process.env.NEXT_PUBLIC_TEMPLATE_MODE === 'true';
}

/**
 * Get the template user object
 *
 * Returns a mock user object matching the AuthUser interface.
 *
 * @returns Template user object
 */
export function getTemplateUser(): TemplateUser {
  return {
    uid: TEMPLATE_USER_ID,
    email: TEMPLATE_EMAIL,
    displayName: TEMPLATE_DISPLAY_NAME,
  };
}

/**
 * Get a mock auth token for template mode
 *
 * This token is recognized by the server-side auth
 * handler when in template mode.
 *
 * @returns Mock token string
 */
export function getTemplateToken(): string {
  return TEMPLATE_TOKEN;
}
