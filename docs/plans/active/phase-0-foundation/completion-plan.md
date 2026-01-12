# Phase 0 Completion Plan - Strict TDD

**Created**: 2026-01-12
**Purpose**: Complete missing deliverables from Phases 0.1-0.4 following strict TDD
**Branch**: `claude/review-implementation-plan-ysmEx`

---

## Executive Summary

This plan addresses the gaps identified in the implementation review:

| Phase | Original Status | Missing Items | TDD Test Count |
|-------|----------------|---------------|----------------|
| 0.1 | ~55% | Config tests, env templates, version alignment | 5 tests |
| 0.2 | Schema done, tests missing | Prisma tests, seed script | 7 tests |
| 0.3 | 0% | Complete Firebase Auth implementation | 13 tests |
| 0.4 | 0% | Complete GraphQL API implementation | 20+ tests |

**Total estimated tests to write**: ~45 tests

---

## TDD Methodology

For each deliverable, we follow **RED → GREEN → REFACTOR**:

1. **RED**: Write failing test that defines expected behavior
2. **GREEN**: Write minimal code to make test pass
3. **REFACTOR**: Clean up while keeping tests green

**Critical Rule**: No implementation code is written before its corresponding test exists and fails.

---

## Phase 0.1 Completion

### 0.1.A: Configuration Validation Tests (RED first)

**Objective**: Add missing `tests/setup/config.test.ts`

#### TDD Step 1: Write Tests (RED)

Create `tests/setup/config.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project Configuration', () => {
  describe('TypeScript Configuration', () => {
    let tsconfig: { compilerOptions: Record<string, unknown> };

    beforeAll(() => {
      tsconfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8')
      );
    });

    it('should have strict mode enabled', () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have noImplicitAny enabled', () => {
      // Covered by strict, but explicit for clarity
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have path alias @/* configured', () => {
      expect(tsconfig.compilerOptions.paths).toHaveProperty('@/*');
    });
  });

  describe('Package Dependencies', () => {
    let packageJson: {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    beforeAll(() => {
      packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
    });

    it('should have Next.js 15+ or 16+ installed', () => {
      const nextVersion = packageJson.dependencies['next'];
      expect(nextVersion).toMatch(/^[\^~]?(15|16)\./);
    });

    it('should have React 19+ installed', () => {
      const reactVersion = packageJson.dependencies['react'];
      expect(reactVersion).toMatch(/^[\^~]?19\./);
    });

    it('should have all required core dependencies', () => {
      const required = [
        'next',
        'react',
        'react-dom',
        '@prisma/client',
        'three',
      ];

      required.forEach((dep) => {
        expect(
          packageJson.dependencies[dep] || packageJson.devDependencies[dep],
          `Missing dependency: ${dep}`
        ).toBeDefined();
      });
    });
  });

  describe('Environment Templates', () => {
    it('should have .env.local.example with required variables', () => {
      const envPath = path.join(process.cwd(), '.env.local.example');
      expect(fs.existsSync(envPath), '.env.local.example should exist').toBe(true);

      const envExample = fs.readFileSync(envPath, 'utf-8');
      const required = [
        'DATABASE_URL',
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      ];

      required.forEach((envVar) => {
        expect(envExample, `Missing env var: ${envVar}`).toContain(envVar);
      });
    });
  });
});
```

**Expected Result**: Tests fail because `.env.local.example` doesn't exist.

#### TDD Step 2: Implement (GREEN)

Create `.env.local.example`:

```bash
# Database (Docker PostgreSQL for local dev)
DATABASE_URL="postgresql://ancestral:localdev@localhost:5433/ancestral_vision"

# Firebase Client (public - safe to expose in client code)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"

# Firebase Emulator (for local development)
NEXT_PUBLIC_FIREBASE_USE_EMULATOR="true"
FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"

# Firebase Admin (server-side only - NEVER expose to client)
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google AI (for Genkit - local dev uses AI Studio key)
GOOGLE_AI_API_KEY="your-ai-studio-api-key"

# Environment
NODE_ENV="development"
```

#### TDD Step 3: Verify

```bash
npx vitest run tests/setup/config.test.ts
```

**Success Criteria**: All 5 tests pass.

---

### 0.1.B: Vitest Environment Correction

**Issue**: Vitest configured with `node` environment instead of `jsdom`.

#### TDD Step 1: Write Test (RED)

Add to `tests/setup/config.test.ts`:

```typescript
describe('Vitest Configuration', () => {
  it('should have jsdom environment for React testing', () => {
    const vitestConfig = fs.readFileSync(
      path.join(process.cwd(), 'vitest.config.ts'),
      'utf-8'
    );
    expect(vitestConfig).toContain("environment: 'jsdom'");
  });
});
```

#### TDD Step 2: Fix (GREEN)

Update `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',  // Changed from 'node'
    globals: true,
    setupFiles: ['./src/lib/test-setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Phase 0.2 Completion

### 0.2.A: Prisma Schema Validation Tests (RED first)

**Objective**: Add missing database constraint tests.

#### TDD Step 1: Write Tests (RED)

Create `src/lib/prisma.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Prisma Schema Validation', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up in correct order (respecting foreign keys)
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw<[{ connected: number }]>`SELECT 1 as connected`;
      expect(result[0].connected).toBe(1);
    });
  });

  describe('User Model (INV-D002)', () => {
    it('should accept Firebase UID as primary key (string, not UUID)', async () => {
      const firebaseUid = 'AbCdEfGhIjKlMnOpQrStUvWxYz123456'; // Firebase UID format

      const user = await prisma.user.create({
        data: {
          id: firebaseUid,
          email: 'test@example.com',
          displayName: 'Test User',
        },
      });

      expect(user.id).toBe(firebaseUid);
    });

    it('should enforce unique email constraint', async () => {
      await prisma.user.create({
        data: {
          id: 'firebase-uid-1',
          email: 'duplicate@example.com',
          displayName: 'User 1',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            id: 'firebase-uid-2',
            email: 'duplicate@example.com',
            displayName: 'User 2',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Constellation Model (INV-D004)', () => {
    it('should generate UUID for constellation ID (INV-D001)', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-uid-constellation',
          email: 'constellation@test.com',
          displayName: 'Constellation User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: 'Test Family',
        },
      });

      // UUID v4 format validation
      expect(constellation.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should enforce one constellation per user (unique ownerId)', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-uid-unique-owner',
          email: 'unique-owner@test.com',
          displayName: 'Unique Owner',
        },
      });

      await prisma.constellation.create({
        data: { ownerId: user.id, title: 'First Constellation' },
      });

      await expect(
        prisma.constellation.create({
          data: { ownerId: user.id, title: 'Second Constellation' },
        })
      ).rejects.toThrow();
    });
  });

  describe('Person Model (INV-D001, INV-D003)', () => {
    it('should generate UUID for person ID', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-uid-person',
          email: 'person@test.com',
          displayName: 'Person User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Person Family' },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'John',
          createdBy: user.id,
        },
      });

      expect(person.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should require givenName field', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-uid-required',
          email: 'required@test.com',
          displayName: 'Required User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Required Family' },
      });

      // TypeScript prevents this, but test runtime behavior
      await expect(
        prisma.person.create({
          data: {
            constellationId: constellation.id,
            createdBy: user.id,
            // givenName intentionally missing
          } as Parameters<typeof prisma.person.create>[0]['data'],
        })
      ).rejects.toThrow();
    });

    it('should support soft delete with deletedAt (INV-D005)', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-uid-softdelete',
          email: 'softdelete@test.com',
          displayName: 'Soft Delete User',
        },
      });

      const constellation = await prisma.constellation.create({
        data: { ownerId: user.id, title: 'Soft Delete Family' },
      });

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: 'Jane',
          createdBy: user.id,
        },
      });

      const deleted = await prisma.person.update({
        where: { id: person.id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.id,
        },
      });

      expect(deleted.deletedAt).toBeInstanceOf(Date);
      expect(deleted.deletedBy).toBe(user.id);

      // Record still exists (soft delete)
      const found = await prisma.person.findUnique({ where: { id: person.id } });
      expect(found).not.toBeNull();
    });
  });
});
```

#### TDD Step 2: Run Tests

```bash
# Ensure database is running
docker-compose up -d

# Run migrations if needed
npx prisma migrate dev

# Run tests
npx vitest run src/lib/prisma.test.ts
```

**Note**: These tests should pass immediately since the schema already exists. This validates that the schema meets the invariants.

---

### 0.2.B: Seed Script (RED first)

**Objective**: Add missing `prisma/seed.ts`.

#### TDD Step 1: Write Test (RED)

Create `prisma/seed.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

describe('Database Seed', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // Clean database
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();

    // Run seed
    execSync('npx prisma db seed', { stdio: 'inherit' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create test user', async () => {
    const user = await prisma.user.findUnique({
      where: { id: 'test-firebase-uid' },
    });
    expect(user).not.toBeNull();
    expect(user?.email).toBe('test@ancestralvision.dev');
  });

  it('should create constellation for test user', async () => {
    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: 'test-firebase-uid' },
    });
    expect(constellation).not.toBeNull();
    expect(constellation?.title).toBe("Test User's Family");
  });

  it('should create at least 4 test people', async () => {
    const people = await prisma.person.findMany({
      where: { constellation: { ownerId: 'test-firebase-uid' } },
    });
    expect(people.length).toBeGreaterThanOrEqual(4);
  });

  it('should set centered person on constellation', async () => {
    const constellation = await prisma.constellation.findFirst({
      where: { ownerId: 'test-firebase-uid' },
    });
    expect(constellation?.centeredPersonId).not.toBeNull();
  });
});
```

#### TDD Step 2: Implement Seed (GREEN)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, Gender, NameOrder } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clean existing test data
  await prisma.person.deleteMany({
    where: { constellation: { ownerId: 'test-firebase-uid' } },
  });
  await prisma.constellation.deleteMany({
    where: { ownerId: 'test-firebase-uid' },
  });
  await prisma.user.deleteMany({
    where: { id: 'test-firebase-uid' },
  });

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      id: 'test-firebase-uid',
      email: 'test@ancestralvision.dev',
      displayName: 'Test User',
    },
  });
  console.log('Created test user:', testUser.id);

  // Create constellation
  const constellation = await prisma.constellation.create({
    data: {
      ownerId: testUser.id,
      title: "Test User's Family",
      description: 'A test constellation for development',
    },
  });
  console.log('Created constellation:', constellation.id);

  // Create test people (3 generations)
  const self = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Alex',
      surname: 'Smith',
      gender: Gender.OTHER,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'exact', year: 1990, month: 6, day: 15 },
      createdBy: testUser.id,
    },
  });

  const mother = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Maria',
      surname: 'Smith',
      maidenName: 'Johnson',
      gender: Gender.FEMALE,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'exact', year: 1965, month: 3, day: 22 },
      createdBy: testUser.id,
    },
  });

  const father = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Robert',
      surname: 'Smith',
      gender: Gender.MALE,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'exact', year: 1962, month: 8, day: 10 },
      createdBy: testUser.id,
    },
  });

  const grandmother = await prisma.person.create({
    data: {
      constellationId: constellation.id,
      givenName: 'Eleanor',
      surname: 'Johnson',
      gender: Gender.FEMALE,
      nameOrder: NameOrder.WESTERN,
      birthDate: { type: 'approximate', year: 1940, isApproximate: true },
      deathDate: { type: 'exact', year: 2015, month: 12, day: 1 },
      createdBy: testUser.id,
    },
  });

  // Update constellation with centered person and stats
  await prisma.constellation.update({
    where: { id: constellation.id },
    data: {
      centeredPersonId: self.id,
      personCount: 4,
      generationSpan: 3,
    },
  });

  console.log('Created 4 people:', {
    self: self.id,
    mother: mother.id,
    father: father.id,
    grandmother: grandmother.id,
  });
  console.log('Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Update `package.json`:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

---

## Phase 0.3: Firebase Auth (Full Implementation)

### 0.3.A: Firebase Client SDK

#### TDD Step 1: Write Test (RED)

Create `src/lib/firebase.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that module exports expected functions
describe('Firebase Client SDK', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export auth instance', async () => {
    const firebase = await import('./firebase');
    expect(firebase.auth).toBeDefined();
  });

  it('should export signInWithEmailAndPassword', async () => {
    const firebase = await import('./firebase');
    expect(firebase.signInWithEmailAndPassword).toBeDefined();
  });

  it('should export createUserWithEmailAndPassword', async () => {
    const firebase = await import('./firebase');
    expect(firebase.createUserWithEmailAndPassword).toBeDefined();
  });

  it('should export signOut', async () => {
    const firebase = await import('./firebase');
    expect(firebase.signOut).toBeDefined();
  });

  it('should export onAuthStateChanged', async () => {
    const firebase = await import('./firebase');
    expect(firebase.onAuthStateChanged).toBeDefined();
  });
});
```

#### TDD Step 2: Implement (GREEN)

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type Auth,
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

function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

const app = initializeFirebase();
const auth: Auth = getAuth(app);

// Connect to emulator in development
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true'
) {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
}

export {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
};

export type { FirebaseUser };
```

---

### 0.3.B: Firebase Admin SDK

#### TDD Step 1: Write Test (RED)

Create `src/lib/firebase-admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Firebase Admin SDK', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export getFirebaseAdmin function', async () => {
    const adminModule = await import('./firebase-admin');
    expect(adminModule.getFirebaseAdmin).toBeDefined();
    expect(typeof adminModule.getFirebaseAdmin).toBe('function');
  });
});
```

#### TDD Step 2: Implement (GREEN)

Create `src/lib/firebase-admin.ts`:

```typescript
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;

export interface FirebaseAdminInstance {
  app: App;
  auth: Auth;
}

export function getFirebaseAdmin(): FirebaseAdminInstance {
  if (!adminApp) {
    if (getApps().length === 0) {
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      adminApp = getApps()[0];
    }
    adminAuth = getAuth(adminApp);
  }

  return {
    app: adminApp,
    auth: adminAuth!,
  };
}
```

---

### 0.3.C: Auth Utilities

#### TDD Step 1: Write Tests (RED)

Create `src/lib/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock Firebase Admin
vi.mock('./firebase-admin', () => ({
  getFirebaseAdmin: vi.fn(() => ({
    auth: {
      verifyIdToken: vi.fn(),
    },
  })),
}));

describe('Auth Utilities', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    await prisma.person.deleteMany();
    await prisma.constellation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('verifyAuthToken', () => {
    it('should return decoded token for valid Firebase token', async () => {
      const { getFirebaseAdmin } = await import('./firebase-admin');
      const mockAuth = (getFirebaseAdmin as ReturnType<typeof vi.fn>)().auth;
      mockAuth.verifyIdToken.mockResolvedValueOnce({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
      });

      const { verifyAuthToken } = await import('./auth');
      const result = await verifyAuthToken('valid-token');

      expect(result).toEqual({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should throw error for invalid Firebase token', async () => {
      const { getFirebaseAdmin } = await import('./firebase-admin');
      const mockAuth = (getFirebaseAdmin as ReturnType<typeof vi.fn>)().auth;
      mockAuth.verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const { verifyAuthToken } = await import('./auth');

      await expect(verifyAuthToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired Firebase token', async () => {
      const { getFirebaseAdmin } = await import('./firebase-admin');
      const mockAuth = (getFirebaseAdmin as ReturnType<typeof vi.fn>)().auth;
      mockAuth.verifyIdToken.mockRejectedValueOnce(new Error('Token has expired'));

      const { verifyAuthToken } = await import('./auth');

      await expect(verifyAuthToken('expired-token')).rejects.toThrow('expired');
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user if found', async () => {
      // Create user directly in database
      await prisma.user.create({
        data: {
          id: 'existing-uid',
          email: 'existing@example.com',
          displayName: 'Existing User',
        },
      });

      const { getOrCreateUser } = await import('./auth');
      const result = await getOrCreateUser({
        uid: 'existing-uid',
        email: 'existing@example.com',
        name: 'Existing User',
      });

      expect(result.id).toBe('existing-uid');
    });

    it('should create new user if not found', async () => {
      const { getOrCreateUser } = await import('./auth');
      const result = await getOrCreateUser({
        uid: 'new-uid',
        email: 'new@example.com',
        name: 'New User',
      });

      expect(result.id).toBe('new-uid');
      expect(result.email).toBe('new@example.com');

      // Verify user was created in database
      const dbUser = await prisma.user.findUnique({ where: { id: 'new-uid' } });
      expect(dbUser).not.toBeNull();
    });

    it('should update lastLoginAt for existing user', async () => {
      const oldDate = new Date('2020-01-01');
      await prisma.user.create({
        data: {
          id: 'login-update-uid',
          email: 'login@example.com',
          displayName: 'Login User',
          lastLoginAt: oldDate,
        },
      });

      const { getOrCreateUser } = await import('./auth');
      const result = await getOrCreateUser({
        uid: 'login-update-uid',
        email: 'login@example.com',
        name: 'Login User',
      });

      expect(result.lastLoginAt).not.toEqual(oldDate);
      expect(result.lastLoginAt!.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('getCurrentUser', () => {
    it('should return null for missing auth header', async () => {
      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser(null);
      expect(result).toBeNull();
    });

    it('should return null for invalid auth header format', async () => {
      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser('InvalidHeader token');
      expect(result).toBeNull();
    });

    it('should return user for valid Bearer token', async () => {
      const { getFirebaseAdmin } = await import('./firebase-admin');
      const mockAuth = (getFirebaseAdmin as ReturnType<typeof vi.fn>)().auth;
      mockAuth.verifyIdToken.mockResolvedValueOnce({
        uid: 'bearer-test-uid',
        email: 'bearer@example.com',
        name: 'Bearer User',
      });

      const { getCurrentUser } = await import('./auth');
      const result = await getCurrentUser('Bearer valid-token');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('bearer-test-uid');
    });
  });
});
```

#### TDD Step 2: Implement (GREEN)

Create `src/lib/auth.ts`:

```typescript
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

  let user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: uid,
        email: email || `${uid}@placeholder.ancestralvision.com`,
        displayName: name || 'New User',
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: uid },
      data: { lastLoginAt: new Date() },
    });
  }

  return user;
}

export async function getCurrentUser(authHeader: string | null): Promise<User | null> {
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

---

### 0.3.D: Auth Provider Component

#### TDD Step 1: Write Tests (RED)

Create `src/components/providers/auth-provider.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Firebase client
vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
}));

import { AuthProvider, useAuth } from './auth-provider';

// Test component
function TestAuthConsumer(): JSX.Element {
  const { user, loading, error, login, logout, register } = useAuth();

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
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

  it('should show loading state initially', async () => {
    const { onAuthStateChanged } = await import('@/lib/firebase');
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(() => () => {});

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should show not logged in when no user', async () => {
    const { onAuthStateChanged } = await import('@/lib/firebase');
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth, callback) => {
        callback(null);
        return () => {};
      }
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });

  it('should show logged in user', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    const { onAuthStateChanged } = await import('@/lib/firebase');
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth, callback) => {
        callback(mockUser);
        return () => {};
      }
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Logged in as test@example.com'
      );
    });
  });

  it('should handle login', async () => {
    const mockUser = {
      uid: 'login-uid',
      email: 'login@example.com',
      displayName: 'Login User',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    const { onAuthStateChanged, signInWithEmailAndPassword } = await import(
      '@/lib/firebase'
    );

    let authCallback: ((user: typeof mockUser | null) => void) | null = null;
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth, callback) => {
        authCallback = callback;
        callback(null);
        return () => {};
      }
    );

    (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: mockUser,
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    // Simulate Firebase auth state change
    act(() => {
      authCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Logged in as login@example.com'
      );
    });
  });

  it('should handle logout', async () => {
    const mockUser = {
      uid: 'logout-uid',
      email: 'logout@example.com',
      displayName: 'Logout User',
    };

    const { onAuthStateChanged, signOut } = await import('@/lib/firebase');

    let authCallback: ((user: typeof mockUser | null) => void) | null = null;
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth, callback) => {
        authCallback = callback;
        callback(mockUser);
        return () => {};
      }
    );

    (signOut as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in');
    });

    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    // Simulate Firebase auth state change
    act(() => {
      authCallback?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });
});
```

#### TDD Step 2: Implement (GREEN)

Create `src/components/providers/auth-provider.tsx`:

```typescript
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
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

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
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
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, getIdToken, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

### 0.3.E: Firebase Emulator Configuration

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

## Phase 0.4: GraphQL API (Full Implementation)

### 0.4.A: GraphQL Test Utilities

#### TDD Step 1: Create Test Utils First

Create `tests/graphql-test-utils.ts`:

```typescript
import { PrismaClient, type User, type Constellation, type Person } from '@prisma/client';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';

const prisma = new PrismaClient();

export interface TestContext {
  user: User | null;
}

export interface TestContextOptions {
  authenticated?: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
}

export async function createTestContext(options: TestContextOptions): Promise<TestContext> {
  if (!options.authenticated) {
    return { user: null };
  }

  const userId = options.userId || 'test-user-id';
  const email = options.email || 'test@example.com';
  const displayName = options.displayName || 'Test User';

  // Ensure user exists in database
  let user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    user = await prisma.user.create({
      data: { id: userId, email, displayName },
    });
  }

  return { user };
}

export interface SeedResult {
  user: User;
  constellation: Constellation;
  people: Person[];
}

export async function seedTestUser(userId = 'seed-test-user'): Promise<SeedResult> {
  // Clean up any existing data for this user
  await prisma.person.deleteMany({
    where: { constellation: { ownerId: userId } },
  });
  await prisma.constellation.deleteMany({ where: { ownerId: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test.com`,
      displayName: `User ${userId}`,
    },
  });

  const constellation = await prisma.constellation.create({
    data: {
      ownerId: user.id,
      title: `${userId}'s Family`,
    },
  });

  const people = await Promise.all([
    prisma.person.create({
      data: {
        constellationId: constellation.id,
        givenName: 'Person',
        surname: 'One',
        createdBy: user.id,
      },
    }),
    prisma.person.create({
      data: {
        constellationId: constellation.id,
        givenName: 'Person',
        surname: 'Two',
        createdBy: user.id,
      },
    }),
  ]);

  return { user, constellation, people };
}

export async function cleanupTestData(): Promise<void> {
  await prisma.person.deleteMany();
  await prisma.constellation.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma as testPrisma };
```

---

### 0.4.B: GraphQL Schema

#### TDD Step 1: Write Schema Test (RED)

Create `src/graphql/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { typeDefs } from './schema';

describe('GraphQL Schema', () => {
  it('should define Query type with me field', () => {
    expect(typeDefs).toContain('type Query');
    expect(typeDefs).toContain('me: User');
  });

  it('should define Query type with constellation field', () => {
    expect(typeDefs).toContain('constellation: Constellation');
  });

  it('should define Mutation type with createConstellation', () => {
    expect(typeDefs).toContain('type Mutation');
    expect(typeDefs).toContain('createConstellation');
  });

  it('should define User type with required fields', () => {
    expect(typeDefs).toContain('type User');
    expect(typeDefs).toMatch(/id:\s*ID!/);
    expect(typeDefs).toMatch(/email:\s*String!/);
  });

  it('should define Person type with required fields', () => {
    expect(typeDefs).toContain('type Person');
    expect(typeDefs).toMatch(/givenName:\s*String!/);
  });

  it('should define auth-required mutations', () => {
    expect(typeDefs).toContain('createPerson');
    expect(typeDefs).toContain('updatePerson');
    expect(typeDefs).toContain('deletePerson');
  });
});
```

#### TDD Step 2: Implement Schema (GREEN)

Create `src/graphql/schema.ts`:

```typescript
export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON

  type Query {
    """Current authenticated user"""
    me: User

    """Current user's constellation"""
    constellation: Constellation

    """Get person by ID (must be in user's constellation)"""
    person(id: ID!): Person

    """List people in user's constellation"""
    people(includeDeleted: Boolean = false): [Person!]!
  }

  type Mutation {
    """Create constellation for authenticated user"""
    createConstellation(input: CreateConstellationInput!): Constellation!

    """Update user's constellation"""
    updateConstellation(input: UpdateConstellationInput!): Constellation!

    """Create person in user's constellation"""
    createPerson(input: CreatePersonInput!): Person!

    """Update person in user's constellation"""
    updatePerson(id: ID!, input: UpdatePersonInput!): Person!

    """Soft delete person (30-day recovery)"""
    deletePerson(id: ID!): Person!
  }

  type User {
    id: ID!
    email: String!
    displayName: String!
    avatarUrl: String
    createdAt: DateTime!
    constellation: Constellation
  }

  type Constellation {
    id: ID!
    title: String!
    description: String
    personCount: Int!
    generationSpan: Int!
    centeredPersonId: ID
    people: [Person!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Person {
    id: ID!
    givenName: String!
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder!
    gender: Gender
    birthDate: JSON
    deathDate: JSON
    birthPlace: JSON
    deathPlace: JSON
    biography: String
    speculative: Boolean!
    deletedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateConstellationInput {
    title: String!
    description: String
  }

  input UpdateConstellationInput {
    title: String
    description: String
    centeredPersonId: ID
  }

  input CreatePersonInput {
    givenName: String!
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder
    gender: Gender
    birthDate: JSON
    deathDate: JSON
    birthPlace: JSON
    deathPlace: JSON
    biography: String
    speculative: Boolean
  }

  input UpdatePersonInput {
    givenName: String
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder
    gender: Gender
    birthDate: JSON
    deathDate: JSON
    birthPlace: JSON
    deathPlace: JSON
    biography: String
    speculative: Boolean
  }

  enum NameOrder {
    WESTERN
    EASTERN
    PATRONYMIC
    PATRONYMIC_SUFFIX
    MATRONYMIC
  }

  enum Gender {
    MALE
    FEMALE
    OTHER
    UNKNOWN
  }
`;
```

---

### 0.4.C: GraphQL Resolvers

#### TDD Step 1: Write Resolver Tests (RED)

Create `src/graphql/resolvers/user.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, cleanupTestData, testPrisma } from '../../../tests/graphql-test-utils';
import { resolvers } from './index';

describe('User Resolvers', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Query: me', () => {
    it('should return current user for authenticated request', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'me-test-user',
        email: 'me@test.com',
        displayName: 'Me User',
      });

      const result = await resolvers.Query.me(null, {}, context);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('me-test-user');
      expect(result?.email).toBe('me@test.com');
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.me(null, {}, context);

      expect(result).toBeNull();
    });
  });
});
```

Create `src/graphql/resolvers/constellation.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestContext,
  cleanupTestData,
  seedTestUser,
  testPrisma,
} from '../../../tests/graphql-test-utils';
import { resolvers } from './index';

describe('Constellation Resolvers', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Query: constellation', () => {
    it('should return user constellation', async () => {
      const { user, constellation } = await seedTestUser('constellation-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.constellation(null, {}, context);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(constellation.id);
    });

    it('should return null for user without constellation', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'no-constellation-user',
      });

      const result = await resolvers.Query.constellation(null, {}, context);

      expect(result).toBeNull();
    });

    it('should return null for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      const result = await resolvers.Query.constellation(null, {}, context);

      expect(result).toBeNull();
    });
  });

  describe('Mutation: createConstellation', () => {
    it('should create constellation for authenticated user', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'create-constellation-user',
      });

      const result = await resolvers.Mutation.createConstellation(
        null,
        { input: { title: 'New Family', description: 'Test description' } },
        context
      );

      expect(result).not.toBeNull();
      expect(result.title).toBe('New Family');
      expect(result.description).toBe('Test description');
    });

    it('should throw error for unauthenticated request', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.createConstellation(
          null,
          { input: { title: 'Test' } },
          context
        )
      ).rejects.toThrow(/authentication/i);
    });

    it('should throw error if user already has constellation', async () => {
      const { user } = await seedTestUser('duplicate-constellation-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      await expect(
        resolvers.Mutation.createConstellation(
          null,
          { input: { title: 'Second Constellation' } },
          context
        )
      ).rejects.toThrow(/already/i);
    });
  });
});
```

Create `src/graphql/resolvers/person.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestContext,
  cleanupTestData,
  seedTestUser,
  testPrisma,
} from '../../../tests/graphql-test-utils';
import { resolvers } from './index';

describe('Person Resolvers', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Query: person', () => {
    it('should return person by ID in user constellation', async () => {
      const { user, people } = await seedTestUser('person-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.person(
        null,
        { id: people[0].id },
        context
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(people[0].id);
    });

    it('should return null for person in other user constellation', async () => {
      const { people: otherPeople } = await seedTestUser('other-person-user');
      const context = await createTestContext({
        authenticated: true,
        userId: 'different-user-id',
      });

      const result = await resolvers.Query.person(
        null,
        { id: otherPeople[0].id },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('Query: people', () => {
    it('should return all non-deleted people in constellation', async () => {
      const { user, people } = await seedTestUser('people-query-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Query.people(
        null,
        { includeDeleted: false },
        context
      );

      expect(result.length).toBe(people.length);
    });

    it('should return empty array for user without constellation', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'no-constellation-people-user',
      });

      const result = await resolvers.Query.people(null, {}, context);

      expect(result).toEqual([]);
    });
  });

  describe('Mutation: createPerson', () => {
    it('should create person in user constellation', async () => {
      const { user } = await seedTestUser('create-person-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.createPerson(
        null,
        { input: { givenName: 'John', surname: 'Doe' } },
        context
      );

      expect(result).not.toBeNull();
      expect(result.givenName).toBe('John');
      expect(result.surname).toBe('Doe');
    });

    it('should throw error without authentication', async () => {
      const context = await createTestContext({ authenticated: false });

      await expect(
        resolvers.Mutation.createPerson(
          null,
          { input: { givenName: 'Test' } },
          context
        )
      ).rejects.toThrow(/authentication/i);
    });

    it('should throw error if user has no constellation', async () => {
      const context = await createTestContext({
        authenticated: true,
        userId: 'no-constellation-create-user',
      });

      await expect(
        resolvers.Mutation.createPerson(
          null,
          { input: { givenName: 'Test' } },
          context
        )
      ).rejects.toThrow(/constellation/i);
    });
  });

  describe('Mutation: deletePerson', () => {
    it('should soft delete person (set deletedAt)', async () => {
      const { user, people } = await seedTestUser('delete-person-user');
      const context = await createTestContext({
        authenticated: true,
        userId: user.id,
      });

      const result = await resolvers.Mutation.deletePerson(
        null,
        { id: people[0].id },
        context
      );

      expect(result.deletedAt).not.toBeNull();
      expect(result.deletedBy).toBe(user.id);

      // Verify still in database
      const dbPerson = await testPrisma.person.findUnique({
        where: { id: people[0].id },
      });
      expect(dbPerson).not.toBeNull();
    });
  });
});
```

#### TDD Step 2: Implement Resolvers (GREEN)

Create `src/graphql/resolvers/index.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import type { User, Constellation, Person } from '@prisma/client';
import { GraphQLError } from 'graphql';

export interface GraphQLContext {
  user: User | null;
}

function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

async function getUserConstellation(userId: string): Promise<Constellation | null> {
  return prisma.constellation.findUnique({
    where: { ownerId: userId },
  });
}

export const resolvers = {
  Query: {
    me: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ): Promise<User | null> => {
      return context.user;
    },

    constellation: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ): Promise<Constellation | null> => {
      if (!context.user) return null;
      return getUserConstellation(context.user.id);
    },

    person: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Person | null> => {
      if (!context.user) return null;

      const constellation = await getUserConstellation(context.user.id);
      if (!constellation) return null;

      return prisma.person.findFirst({
        where: {
          id: args.id,
          constellationId: constellation.id,
        },
      });
    },

    people: async (
      _parent: unknown,
      args: { includeDeleted?: boolean },
      context: GraphQLContext
    ): Promise<Person[]> => {
      if (!context.user) return [];

      const constellation = await getUserConstellation(context.user.id);
      if (!constellation) return [];

      return prisma.person.findMany({
        where: {
          constellationId: constellation.id,
          ...(args.includeDeleted ? {} : { deletedAt: null }),
        },
        orderBy: { createdAt: 'asc' },
      });
    },
  },

  Mutation: {
    createConstellation: async (
      _parent: unknown,
      args: { input: { title: string; description?: string } },
      context: GraphQLContext
    ): Promise<Constellation> => {
      const user = requireAuth(context);

      const existing = await getUserConstellation(user.id);
      if (existing) {
        throw new GraphQLError('User already has a constellation', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return prisma.constellation.create({
        data: {
          ownerId: user.id,
          title: args.input.title,
          description: args.input.description,
        },
      });
    },

    updateConstellation: async (
      _parent: unknown,
      args: { input: { title?: string; description?: string; centeredPersonId?: string } },
      context: GraphQLContext
    ): Promise<Constellation> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.constellation.update({
        where: { id: constellation.id },
        data: {
          ...(args.input.title && { title: args.input.title }),
          ...(args.input.description !== undefined && { description: args.input.description }),
          ...(args.input.centeredPersonId !== undefined && {
            centeredPersonId: args.input.centeredPersonId,
          }),
        },
      });
    },

    createPerson: async (
      _parent: unknown,
      args: { input: CreatePersonInput },
      context: GraphQLContext
    ): Promise<Person> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User must have a constellation to create people', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const person = await prisma.person.create({
        data: {
          constellationId: constellation.id,
          givenName: args.input.givenName,
          surname: args.input.surname,
          maidenName: args.input.maidenName,
          patronymic: args.input.patronymic,
          matronymic: args.input.matronymic,
          nickname: args.input.nickname,
          suffix: args.input.suffix,
          nameOrder: args.input.nameOrder || 'WESTERN',
          gender: args.input.gender,
          birthDate: args.input.birthDate,
          deathDate: args.input.deathDate,
          birthPlace: args.input.birthPlace,
          deathPlace: args.input.deathPlace,
          biography: args.input.biography,
          speculative: args.input.speculative || false,
          createdBy: user.id,
        },
      });

      // Update constellation person count
      await prisma.constellation.update({
        where: { id: constellation.id },
        data: { personCount: { increment: 1 } },
      });

      return person;
    },

    updatePerson: async (
      _parent: unknown,
      args: { id: string; input: UpdatePersonInput },
      context: GraphQLContext
    ): Promise<Person> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Verify person belongs to user's constellation
      const person = await prisma.person.findFirst({
        where: {
          id: args.id,
          constellationId: constellation.id,
        },
      });

      if (!person) {
        throw new GraphQLError('Person not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.person.update({
        where: { id: args.id },
        data: args.input,
      });
    },

    deletePerson: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ): Promise<Person> => {
      const user = requireAuth(context);

      const constellation = await getUserConstellation(user.id);
      if (!constellation) {
        throw new GraphQLError('User has no constellation', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const person = await prisma.person.findFirst({
        where: {
          id: args.id,
          constellationId: constellation.id,
        },
      });

      if (!person) {
        throw new GraphQLError('Person not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Soft delete
      const deleted = await prisma.person.update({
        where: { id: args.id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.id,
        },
      });

      // Update constellation person count
      await prisma.constellation.update({
        where: { id: constellation.id },
        data: { personCount: { decrement: 1 } },
      });

      return deleted;
    },
  },

  // Field resolvers
  User: {
    constellation: async (parent: User): Promise<Constellation | null> => {
      return prisma.constellation.findUnique({
        where: { ownerId: parent.id },
      });
    },
  },

  Constellation: {
    people: async (parent: Constellation): Promise<Person[]> => {
      return prisma.person.findMany({
        where: {
          constellationId: parent.id,
          deletedAt: null,
        },
      });
    },
  },
};

interface CreatePersonInput {
  givenName: string;
  surname?: string;
  maidenName?: string;
  patronymic?: string;
  matronymic?: string;
  nickname?: string;
  suffix?: string;
  nameOrder?: 'WESTERN' | 'EASTERN' | 'PATRONYMIC' | 'PATRONYMIC_SUFFIX' | 'MATRONYMIC';
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  birthDate?: unknown;
  deathDate?: unknown;
  birthPlace?: unknown;
  deathPlace?: unknown;
  biography?: string;
  speculative?: boolean;
}

type UpdatePersonInput = Partial<CreatePersonInput>;
```

---

### 0.4.D: GraphQL Context

Create `src/graphql/context.ts`:

```typescript
import type { User } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

export interface GraphQLContext {
  user: User | null;
}

export async function createContext(request: Request): Promise<GraphQLContext> {
  const authHeader = request.headers.get('authorization');
  const user = await getCurrentUser(authHeader);
  return { user };
}
```

---

### 0.4.E: GraphQL API Route

Create `src/app/api/graphql/route.ts`:

```typescript
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { createContext } from '@/graphql/context';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const { handleRequest } = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
});

export { handleRequest as GET, handleRequest as POST };
```

---

## Verification Commands

```bash
# Phase 0.1 Completion
npx vitest run tests/setup/config.test.ts

# Phase 0.2 Completion
docker-compose up -d
npx prisma migrate dev
npx vitest run src/lib/prisma.test.ts
npx prisma db seed
npx vitest run prisma/seed.test.ts

# Phase 0.3 (Firebase Auth)
npx vitest run src/lib/firebase.test.ts
npx vitest run src/lib/firebase-admin.test.ts
npx vitest run src/lib/auth.test.ts
npx vitest run src/components/providers/auth-provider.test.tsx

# Phase 0.4 (GraphQL API)
npx vitest run src/graphql/schema.test.ts
npx vitest run src/graphql/resolvers

# Full test suite
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build
npm run build
```

---

## Success Criteria

- [ ] **0.1**: All 6 config tests pass
- [ ] **0.1**: `.env.local.example` exists with all required variables
- [ ] **0.1**: Vitest configured with `jsdom` environment
- [ ] **0.2**: All 7 Prisma tests pass
- [ ] **0.2**: Seed script creates test data
- [ ] **0.3**: All 13 auth tests pass
- [ ] **0.3**: Firebase emulator starts on port 9099
- [ ] **0.4**: All 20+ GraphQL resolver tests pass
- [ ] **0.4**: GraphQL playground accessible at /api/graphql
- [ ] **Full**: `npm test` passes all tests
- [ ] **Full**: `npx tsc --noEmit` passes
- [ ] **Full**: `npm run lint` passes
- [ ] **Full**: `npm run build` succeeds

---

## Estimated Test Counts

| Phase | Component | Test Count |
|-------|-----------|------------|
| 0.1 | Config validation | 6 |
| 0.2 | Prisma schema | 7 |
| 0.2 | Seed script | 4 |
| 0.3 | Firebase client | 5 |
| 0.3 | Firebase admin | 1 |
| 0.3 | Auth utilities | 7 |
| 0.3 | Auth provider | 5 |
| 0.4 | Schema definition | 6 |
| 0.4 | User resolvers | 2 |
| 0.4 | Constellation resolvers | 5 |
| 0.4 | Person resolvers | 7 |
| **Total** | | **~55 tests** |

---

*Created: 2026-01-12*
*Last Updated: 2026-01-12*
