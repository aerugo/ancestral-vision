# Phase 2: Auth Bypass Mechanism

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Enable client-side mock authentication when template mode is active, bypassing Firebase authentication while maintaining the same auth state interface for components.

---

## Invariants Enforced in This Phase

- **INV-S001**: All API endpoints require authentication - Template mode provides mock token for GraphQL
- **NEW INV-D010**: Template Mode Development Only - Tests verify mode only activates in development

---

## TDD Steps

### Step 2.1: Write Failing Tests for Template Mode Detection (RED)

Create `src/lib/template-mode.test.ts`:

**Test Cases**:

1. `it('should detect template mode from environment variable')` - ENV detection
2. `it('should return false when ENV not set')` - Default behavior
3. `it('should return false in production even if ENV set')` - Security guard
4. `it('should provide template user object')` - Mock user generation
5. `it('should provide mock auth token')` - Token for GraphQL

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isTemplateMode, getTemplateUser, getTemplateToken, TEMPLATE_USER_ID } from './template-mode';

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
    it('should return true when NEXT_PUBLIC_TEMPLATE_MODE is "true"', () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'true';
      process.env.NODE_ENV = 'development';

      expect(isTemplateMode()).toBe(true);
    });

    it('should return false when NEXT_PUBLIC_TEMPLATE_MODE is not set', () => {
      delete process.env.NEXT_PUBLIC_TEMPLATE_MODE;
      process.env.NODE_ENV = 'development';

      expect(isTemplateMode()).toBe(false);
    });

    it('should return false in production even if NEXT_PUBLIC_TEMPLATE_MODE is set', () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'true';
      process.env.NODE_ENV = 'production';

      expect(isTemplateMode()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_TEMPLATE_MODE is "false"', () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'false';
      process.env.NODE_ENV = 'development';

      expect(isTemplateMode()).toBe(false);
    });
  });

  describe('getTemplateUser', () => {
    it('should return template user object', () => {
      const user = getTemplateUser();

      expect(user).toEqual({
        uid: TEMPLATE_USER_ID,
        email: 'template@ancestralvision.dev',
        displayName: 'Template Person',
      });
    });
  });

  describe('getTemplateToken', () => {
    it('should return a mock token string', () => {
      const token = getTemplateToken();

      expect(token).toBe('template-mode-token');
    });
  });
});
```

### Step 2.2: Implement Template Mode Detection (GREEN)

Create `src/lib/template-mode.ts`:

```typescript
/**
 * Template Mode Utilities
 *
 * Detect and manage template mode for visual testing.
 * Template mode bypasses Firebase auth with a mock user.
 *
 * SECURITY: Template mode only works in development environment.
 */

export const TEMPLATE_USER_ID = 'template-user';
const TEMPLATE_EMAIL = 'template@ancestralvision.dev';
const TEMPLATE_DISPLAY_NAME = 'Template Person';
const TEMPLATE_TOKEN = 'template-mode-token';

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
export function getTemplateUser(): { uid: string; email: string; displayName: string } {
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
```

### Step 2.3: Write Failing Tests for Auth Provider Template Mode (RED)

Create `src/components/providers/auth-provider.test.tsx`:

**Test Cases**:

1. `it('should inject template user when template mode active')` - Mock user injection
2. `it('should use Firebase auth when template mode inactive')` - Normal path
3. `it('should provide template token via getIdToken')` - Token for GraphQL

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';

// Mock the template-mode module
vi.mock('@/lib/template-mode', () => ({
  isTemplateMode: vi.fn(),
  getTemplateUser: vi.fn(() => ({
    uid: 'template-user',
    email: 'template@test.dev',
    displayName: 'Template Test',
  })),
  getTemplateToken: vi.fn(() => 'mock-template-token'),
  TEMPLATE_USER_ID: 'template-user',
}));

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Simulate no Firebase user
    callback(null);
    return () => {};
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

// Test component that uses auth
function TestConsumer(): React.ReactElement {
  const { user, loading } = useAuth();
  if (loading) return <div data-testid="loading">Loading</div>;
  if (!user) return <div data-testid="no-user">No user</div>;
  return <div data-testid="user">{user.displayName}</div>;
}

describe('AuthProvider template mode', () => {
  const mockIsTemplateMode = vi.mocked(await import('@/lib/template-mode')).isTemplateMode;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should inject template user when template mode active', async () => {
    mockIsTemplateMode.mockReturnValue(true);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Template Test');
    });
  });

  it('should show no user when template mode inactive and Firebase has no user', async () => {
    mockIsTemplateMode.mockReturnValue(false);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    });
  });
});
```

### Step 2.4: Modify Auth Provider for Template Mode (GREEN)

Modify `src/components/providers/auth-provider.tsx`:

Add template mode check at the beginning of the `useEffect`:

```typescript
// At the top of the file, add import
import { isTemplateMode, getTemplateUser, getTemplateToken } from '@/lib/template-mode';

// In the useEffect that handles auth state:
useEffect(() => {
  const { setUser: setStoreUser, setToken, clearUser: clearStoreUser } = useAuthStore.getState();

  // Check for template mode first
  if (isTemplateMode()) {
    const templateUser = getTemplateUser();
    setUser({
      uid: templateUser.uid,
      email: templateUser.email,
      displayName: templateUser.displayName,
    });
    setStoreUser({
      uid: templateUser.uid,
      email: templateUser.email,
      displayName: templateUser.displayName,
    });
    setToken(getTemplateToken());
    setLoading(false);
    return; // Skip Firebase subscription in template mode
  }

  // Rest of the existing Firebase code...
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    // ... existing code
  });

  return () => unsubscribe();
}, []);
```

### Step 2.5: Write Failing Tests for Server-Side Template Auth (RED)

Create `src/lib/auth.test.ts`:

**Test Cases**:

1. `it('should recognize template token and return template user')` - Server-side bypass
2. `it('should verify Firebase token when not template mode')` - Normal path

```typescript
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUser } from './auth';

// Mock template mode
vi.mock('./template-mode', () => ({
  isTemplateMode: vi.fn(),
  TEMPLATE_USER_ID: 'template-user',
}));

// Mock Prisma
vi.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    constellation: {
      create: vi.fn(),
    },
  },
}));

describe('auth with template mode', () => {
  const mockIsTemplateMode = vi.mocked(await import('./template-mode')).isTemplateMode;
  const mockPrisma = vi.mocked(await import('./prisma')).prisma;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return template user for template token', async () => {
    mockIsTemplateMode.mockReturnValue(true);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'template-user',
      email: 'template@ancestralvision.dev',
      displayName: 'Template Person',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      avatarUrl: null,
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      preferences: {},
      subscription: {},
    });

    const user = await getCurrentUser('Bearer template-mode-token');

    expect(user).not.toBeNull();
    expect(user!.id).toBe('template-user');
  });
});
```

### Step 2.6: Modify Server Auth for Template Mode (GREEN)

Modify `src/lib/auth.ts`:

```typescript
import { isTemplateMode, TEMPLATE_USER_ID } from './template-mode';

// Modify getCurrentUser function
export async function getCurrentUser(authHeader: string | null): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] No Authorization header or invalid format');
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) {
    console.log('[Auth] Empty token');
    return null;
  }

  // Check for template mode token
  if (isTemplateMode() && token === 'template-mode-token') {
    console.log('[Auth] Template mode - returning template user');
    return prisma.user.findUnique({
      where: { id: TEMPLATE_USER_ID },
    });
  }

  // Rest of existing Firebase verification...
}
```

### Step 2.7: Refactor

- Ensure complete type annotations
- Add JSDoc comments
- Clean up mock definitions

---

## Implementation Details

### Template Mode Detection Flow

```
Client loads page
      │
      ▼
┌─────────────────┐
│ isTemplateMode()│
│ checks ENV      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  true      false
    │         │
    ▼         ▼
Mock User   Firebase
injected    auth flow
```

### Security Considerations

- **Production Guard**: `isTemplateMode()` always returns `false` in production
- **Token Validation**: Template token only accepted when `isTemplateMode()` is true on server
- **No Real Auth Bypass**: Template mode doesn't disable Firebase, it provides an alternative path

### Edge Cases to Handle

- Template mode env var set but user not seeded (should error gracefully)
- Template mode with invalid token (reject)
- Mixed mode (template env + real Firebase user) - template mode takes precedence

### Error Handling

- Missing template user: Log warning and return null (don't crash)
- Invalid template token format: Fall through to Firebase verification

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/template-mode.ts` | CREATE | Template mode detection utilities |
| `src/lib/template-mode.test.ts` | CREATE | Unit tests |
| `src/components/providers/auth-provider.tsx` | MODIFY | Add template mode support |
| `src/components/providers/auth-provider.test.tsx` | CREATE | Auth provider tests |
| `src/lib/auth.ts` | MODIFY | Server-side template auth |
| `src/lib/auth.test.ts` | CREATE | Server auth tests |

---

## Verification

```bash
# Run template mode tests
npx vitest src/lib/template-mode.test.ts

# Run auth provider tests
npx vitest src/components/providers/auth-provider.test.tsx

# Run server auth tests
npx vitest src/lib/auth.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] Template mode correctly detected from environment
- [ ] Mock user injected on client in template mode
- [ ] Server accepts template token in template mode
- [ ] Regular auth flow unchanged when template mode inactive
- [ ] INV-D010 enforced (no template mode in production)

---

*Template version: 1.0*
