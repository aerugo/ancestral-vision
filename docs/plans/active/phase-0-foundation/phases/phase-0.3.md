# Phase 0.3: Firebase Auth

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Integrate Firebase Authentication with email/password login. Create auth context, login/register pages, and server-side token validation.

---

## Invariants Enforced in This Phase

- **INV-S001**: All GraphQL mutations require authenticated user
- **INV-S002**: Users can only access their own Constellation
- **INV-S003**: Firebase tokens validated server-side before database access
- **INV-S004**: Auth state synchronized between client and server

---

## TDD Steps

### Step 0.3.1: Write Failing Tests (RED)

Create `src/lib/auth.test.ts`:

**Test Cases**:

1. `it('should validate a valid Firebase token')` - Token verification
2. `it('should reject an invalid Firebase token')` - Security test
3. `it('should reject an expired Firebase token')` - Security test
4. `it('should extract user ID from valid token')` - ID extraction
5. `it('should create or update user on first login')` - Database sync

Create `src/components/providers/auth-provider.test.tsx`:

**Test Cases**:

1. `it('should provide null user when not authenticated')` - Initial state
2. `it('should provide user after login')` - Login flow
3. `it('should clear user after logout')` - Logout flow
4. `it('should persist auth state across page refreshes')` - Persistence

```typescript
// src/lib/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
  },
  auth: vi.fn(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

import { verifyAuthToken, getOrCreateUser } from './auth';

describe('Auth Utilities', () => {
  describe('verifyAuthToken', () => {
    it('should validate a valid Firebase token', async () => {
      const mockDecodedToken = {
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Setup mock to return valid token
      const { auth } = await import('firebase-admin');
      (auth().verifyIdToken as vi.Mock).mockResolvedValueOnce(mockDecodedToken);

      const result = await verifyAuthToken('valid-token');

      expect(result).toEqual({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should reject an invalid Firebase token', async () => {
      const { auth } = await import('firebase-admin');
      (auth().verifyIdToken as vi.Mock).mockRejectedValueOnce(
        new Error('Invalid token')
      );

      await expect(verifyAuthToken('invalid-token')).rejects.toThrow(
        'Invalid token'
      );
    });

    it('should reject an expired Firebase token', async () => {
      const { auth } = await import('firebase-admin');
      (auth().verifyIdToken as vi.Mock).mockRejectedValueOnce(
        new Error('Token expired')
      );

      await expect(verifyAuthToken('expired-token')).rejects.toThrow(
        'Token expired'
      );
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user if found', async () => {
      const existingUser = {
        id: 'test-firebase-uid',
        email: 'existing@example.com',
        displayName: 'Existing User',
      };

      // Mock Prisma to return existing user
      // (implementation details depend on how Prisma is mocked)

      const result = await getOrCreateUser({
        uid: 'test-firebase-uid',
        email: 'existing@example.com',
        name: 'Existing User',
      });

      expect(result.id).toBe('test-firebase-uid');
    });

    it('should create new user if not found', async () => {
      // Mock Prisma to return null then create
      const result = await getOrCreateUser({
        uid: 'new-firebase-uid',
        email: 'new@example.com',
        name: 'New User',
      });

      expect(result.id).toBe('new-firebase-uid');
      expect(result.email).toBe('new@example.com');
    });
  });
});
```

```typescript
// src/components/providers/auth-provider.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth-provider';

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Test component that uses auth context
function TestComponent() {
  const { user, loading, login, logout, register } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => register('new@example.com', 'password', 'New User')}>
        Register
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide null user when not authenticated', async () => {
    const { onAuthStateChanged } = await import('firebase/auth');
    (onAuthStateChanged as vi.Mock).mockImplementation((auth, callback) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Not logged in'
      );
    });
  });

  it('should provide user after login', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    const { signInWithEmailAndPassword, onAuthStateChanged } = await import(
      'firebase/auth'
    );
    (signInWithEmailAndPassword as vi.Mock).mockResolvedValueOnce({
      user: mockUser,
    });
    (onAuthStateChanged as vi.Mock).mockImplementation((auth, callback) => {
      // Initially null, then user after login
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    // Simulate auth state change after login
    const authCallback = (onAuthStateChanged as vi.Mock).mock.calls[0][1];
    act(() => {
      authCallback(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Logged in as test@example.com'
      );
    });
  });

  it('should clear user after logout', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    const { signOut, onAuthStateChanged } = await import('firebase/auth');
    (signOut as vi.Mock).mockResolvedValueOnce(undefined);
    (onAuthStateChanged as vi.Mock).mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in');
    });

    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    // Simulate auth state change after logout
    const authCallback = (onAuthStateChanged as vi.Mock).mock.calls[0][1];
    act(() => {
      authCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Not logged in'
      );
    });
  });
});
```

### Step 0.3.2: Implement to Pass Tests (GREEN)

Create the following files:

**`src/lib/firebase.ts`** - Firebase client configuration:

```typescript
// src/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Connect to emulator in development
if (
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true' &&
  typeof window !== 'undefined'
) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}

export {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
export type { FirebaseUser };
```

**`src/lib/firebase-admin.ts`** - Firebase Admin SDK (server-side):

```typescript
// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;
let adminAuth: Auth;

function getFirebaseAdmin(): { app: App; auth: Auth } {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
            /\\n/g,
            '\n'
          ),
        }),
      });
    } else {
      app = getApps()[0];
    }
    adminAuth = getAuth(app);
  }

  return { app, auth: adminAuth };
}

export { getFirebaseAdmin };
```

**`src/lib/auth.ts`** - Auth utilities:

```typescript
// src/lib/auth.ts
import { getFirebaseAdmin } from './firebase-admin';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

export interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
}

export async function verifyAuthToken(token: string): Promise<DecodedToken> {
  const { auth } = getFirebaseAdmin();
  const decodedToken = await auth.verifyIdToken(token);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name,
  };
}

export async function getOrCreateUser(tokenData: DecodedToken): Promise<User> {
  const { uid, email, name } = tokenData;

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        id: uid,
        email: email || `${uid}@placeholder.ancestralvision.com`,
        displayName: name || 'New User',
      },
    });
  } else {
    // Update last login
    user = await prisma.user.update({
      where: { id: uid },
      data: { lastLoginAt: new Date() },
    });
  }

  return user;
}

export async function getCurrentUser(
  authHeader: string | null
): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const tokenData = await verifyAuthToken(token);
    return await getOrCreateUser(tokenData);
  } catch {
    return null;
  }
}
```

**`src/components/providers/auth-provider.tsx`** - Auth context:

```typescript
// src/components/providers/auth-provider.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type FirebaseUser,
} from '@/lib/firebase';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setError(null);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(firebaseUser, { displayName });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Step 0.3.3: Refactor

1. Add password reset functionality
2. Add error handling for common Firebase errors
3. Create reusable auth guard component

---

## Implementation Details

### Firebase Emulator Configuration

Create `firebase.json`:

```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/firebase.ts` | CREATE | Firebase client SDK |
| `src/lib/firebase-admin.ts` | CREATE | Firebase Admin SDK |
| `src/lib/auth.ts` | CREATE | Auth utilities |
| `src/lib/auth.test.ts` | CREATE | Auth utility tests |
| `src/components/providers/auth-provider.tsx` | CREATE | Auth context |
| `src/components/providers/auth-provider.test.tsx` | CREATE | Auth context tests |
| `firebase.json` | CREATE | Firebase emulator config |

---

## Verification

```bash
# Start Firebase emulator
npm run emulators

# Run auth tests
npx vitest run src/lib/auth.test.ts
npx vitest run src/components/providers/auth-provider.test.tsx

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Firebase emulator starts on port 9099
- [ ] Can register new user via emulator
- [ ] Can login/logout
- [ ] Token validation works server-side
- [ ] User synced to database on first login
- [ ] Type check passes
- [ ] Lint passes
- [ ] INV-S001 through INV-S004 enforced by tests
