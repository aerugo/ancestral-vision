# Phase 3: Dev Server Integration

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Create npm scripts and shell scripts that orchestrate template mode startup, including database seeding and environment configuration.

---

## Invariants Enforced in This Phase

- **INV-D010**: Template Mode Development Only - Scripts only run in development context

---

## TDD Steps

### Step 3.1: Create Shell Script for Template Mode

Create `scripts/dev-template.sh`:

```bash
#!/bin/bash
# Template Mode Development Server
#
# Starts the development server with template data pre-loaded.
# This is for visual testing and development only.

set -e

# Ensure we're in development mode
export NODE_ENV=development
export NEXT_PUBLIC_TEMPLATE_MODE=true

echo "🔧 Template Mode - Starting development server..."

# Check if database is accessible
echo "📊 Checking database connection..."
npx prisma db push --skip-generate 2>/dev/null || {
    echo "❌ Database not accessible. Please run 'npm run docker:up' first."
    exit 1
}

# Seed template data (idempotent)
echo "🌱 Seeding template data..."
npx ts-node prisma/seed-template.ts

# Start the dev server
echo "🚀 Starting Next.js dev server in template mode..."
echo "   Open http://localhost:3000/constellation to view"
echo ""
exec next dev
```

### Step 3.2: Add npm Scripts to package.json

Modify `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:template": "bash scripts/dev-template.sh",
    "seed:template": "ts-node prisma/seed-template.ts",
    "seed:template:force": "FORCE_RESEED=true ts-node prisma/seed-template.ts"
  }
}
```

### Step 3.3: Write Integration Test for Template Mode Startup

Create `tests/integration/template-mode.test.ts`:

**Test Cases**:

1. `it('should detect template mode environment variable')` - ENV check
2. `it('should have template user in database after seed')` - Seed verification

```typescript
/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

describe('Template Mode Integration', () => {
  describe('environment detection', () => {
    it('should detect NEXT_PUBLIC_TEMPLATE_MODE environment variable', () => {
      // This test verifies the environment detection works
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'true';
      process.env.NODE_ENV = 'development';

      // Import the module fresh to pick up env changes
      const { isTemplateMode } = require('@/lib/template-mode');

      expect(isTemplateMode()).toBe(true);
    });

    it('should not activate in production', () => {
      process.env.NEXT_PUBLIC_TEMPLATE_MODE = 'true';
      process.env.NODE_ENV = 'production';

      const { isTemplateMode } = require('@/lib/template-mode');

      expect(isTemplateMode()).toBe(false);
    });
  });

  describe('template seeding', () => {
    beforeAll(async () => {
      // Run the seed script
      execSync('npx ts-node prisma/seed-template.ts', {
        env: { ...process.env, NODE_ENV: 'development' },
        stdio: 'pipe',
      });
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('should create template user', async () => {
      const user = await prisma.user.findUnique({
        where: { id: 'template-user' },
      });

      expect(user).not.toBeNull();
      expect(user!.displayName).toBe('Template Person');
    });

    it('should create constellation with many people', async () => {
      const constellation = await prisma.constellation.findFirst({
        where: { ownerId: 'template-user' },
        include: { _count: { select: { people: true } } },
      });

      expect(constellation).not.toBeNull();
      expect(constellation!._count.people).toBeGreaterThan(100);
    });

    it('should mark onboarding as completed', async () => {
      const onboarding = await prisma.onboardingProgress.findFirst({
        where: { userId: 'template-user' },
      });

      expect(onboarding).not.toBeNull();
      expect(onboarding!.status).toBe('COMPLETED');
    });
  });
});
```

### Step 3.4: Update Seed Script for Idempotency

Modify `prisma/seed-template.ts` to support `FORCE_RESEED`:

```typescript
const FORCE_RESEED = process.env.FORCE_RESEED === 'true';

export async function seedTemplateData(): Promise<void> {
  console.log('🌱 Template Mode Seeding...');

  // Check if template user already exists
  const existingUser = await prisma.user.findUnique({
    where: { id: TEMPLATE_USER_ID },
  });

  if (existingUser && !FORCE_RESEED) {
    console.log('✅ Template user already exists. Skipping seed.');
    console.log('   Use FORCE_RESEED=true to re-seed data.');
    return;
  }

  if (existingUser && FORCE_RESEED) {
    console.log('🔄 Force reseed requested. Cleaning existing data...');
    await cleanTemplateData();
  }

  // ... rest of seeding logic
}
```

### Step 3.5: Add Documentation

Create section in README.md or CONTRIBUTING.md:

```markdown
## Template Mode for Visual Testing

Template mode allows developers to quickly test the 3D visualization
with a rich dataset (119 people, 150+ relationships) without manual setup.

### Usage

```bash
# Start dev server with template data
npm run dev:template
```

This will:
1. Seed the database with example genealogy data
2. Set up a template user with completed onboarding
3. Start the dev server with auth bypassed

Open http://localhost:3000/constellation to view.

### Reseeding Data

Template data is only seeded once. To force a reseed:

```bash
npm run seed:template:force
```

### How It Works

- Environment variable `NEXT_PUBLIC_TEMPLATE_MODE=true` signals template mode
- Auth is bypassed with a mock user (client-side injection)
- GraphQL requests use a special template token
- Only works in development environment (security guard)
```

---

## Implementation Details

### Script Flow

```
npm run dev:template
        │
        ▼
┌───────────────────┐
│ scripts/          │
│ dev-template.sh   │
└─────────┬─────────┘
          │
          ▼
    Set ENV vars:
    NODE_ENV=development
    NEXT_PUBLIC_TEMPLATE_MODE=true
          │
          ▼
    Check database
          │
          ▼
    Run seed-template.ts
          │
          ▼
    Start next dev
          │
          ▼
    Browser → /constellation
    (with template user)
```

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `development` | Ensures template mode guard passes |
| `NEXT_PUBLIC_TEMPLATE_MODE` | `true` | Signals template mode to client+server |
| `FORCE_RESEED` | `true` (optional) | Force re-creation of template data |

### Error Scenarios

- **Database not running**: Script exits with helpful message
- **Seed fails**: Script exits, dev server doesn't start
- **Template user missing at runtime**: Auth returns null, user sees login page

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `scripts/dev-template.sh` | CREATE | Shell script for template startup |
| `package.json` | MODIFY | Add npm scripts |
| `prisma/seed-template.ts` | MODIFY | Add FORCE_RESEED and idempotency |
| `tests/integration/template-mode.test.ts` | CREATE | Integration tests |
| `README.md` or `CONTRIBUTING.md` | MODIFY | Add documentation |

---

## Verification

```bash
# Test the full flow
npm run dev:template
# Open http://localhost:3000/constellation
# Verify 119+ people render

# Test force reseed
npm run seed:template:force
# Should re-create all data

# Test regular dev mode still works
npm run dev
# Should require login as normal

# Run integration tests
npx vitest tests/integration/template-mode.test.ts

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] `npm run dev:template` starts template mode successfully
- [ ] Template user created if not exists
- [ ] Template data not re-seeded on subsequent runs (idempotent)
- [ ] `npm run seed:template:force` force re-seeds data
- [ ] Regular `npm run dev` works unchanged
- [ ] Documentation added
- [ ] Integration tests pass
- [ ] Manual verification: 119+ people visible in constellation

---

*Template version: 1.0*
