# Phase 0.1: Project Setup

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Initialize the Next.js 15+ project with TypeScript, Tailwind CSS, and all development tooling. Create Docker Compose for local PostgreSQL and environment variable templates.

---

## Invariants Established in This Phase

- **NEW INV-T001**: TypeScript strict mode enabled (`"strict": true`)
- **NEW INV-T002**: No `any` types allowed (enforced by ESLint)
- **NEW INV-T003**: All dependencies must be pinned to exact versions

---

## TDD Steps

### Step 0.1.1: Write Failing Tests (RED)

Create `tests/setup/config.test.ts`:

**Test Cases**:

1. `it('should have TypeScript strict mode enabled')` - Verifies tsconfig.json has strict: true
2. `it('should have required environment variables defined')` - Verifies .env.local.example contains all required vars
3. `it('should have Next.js 15+ installed')` - Verifies package.json has Next.js >= 15
4. `it('should have React 19 installed')` - Verifies package.json has React >= 19
5. `it('should have all required dependencies')` - Verifies core dependencies present

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project Configuration', () => {
  describe('TypeScript', () => {
    it('should have TypeScript strict mode enabled', () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8')
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have no implicit any disabled', () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8')
      );
      expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    });
  });

  describe('Dependencies', () => {
    let packageJson: { dependencies: Record<string, string>; devDependencies: Record<string, string> };

    beforeAll(() => {
      packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
    });

    it('should have Next.js 15+ installed', () => {
      const nextVersion = packageJson.dependencies['next'];
      expect(nextVersion).toMatch(/^[\^~]?15\./);
    });

    it('should have React 19+ installed', () => {
      const reactVersion = packageJson.dependencies['react'];
      expect(reactVersion).toMatch(/^[\^~]?19\./);
    });

    it('should have required core dependencies', () => {
      const required = [
        'next',
        'react',
        'react-dom',
        'typescript',
        '@prisma/client',
        'graphql',
        'graphql-yoga',
        'firebase',
        'firebase-admin',
        '@tanstack/react-query',
        'zustand',
        'three',
      ];

      required.forEach((dep) => {
        expect(
          packageJson.dependencies[dep] || packageJson.devDependencies[dep]
        ).toBeDefined();
      });
    });
  });

  describe('Environment Variables', () => {
    it('should have .env.local.example with required variables', () => {
      const envExample = fs.readFileSync(
        path.join(process.cwd(), '.env.local.example'),
        'utf-8'
      );

      const required = [
        'DATABASE_URL',
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      ];

      required.forEach((envVar) => {
        expect(envExample).toContain(envVar);
      });
    });
  });
});
```

### Step 0.1.2: Implement to Pass Tests (GREEN)

Create the following files to make tests pass:

**package.json**:
```json
{
  "name": "ancestral-vision",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint && eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "db:start": "docker-compose up -d",
    "db:stop": "docker-compose down",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "emulators": "firebase emulators:start --only auth",
    "format": "prettier --write ."
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@prisma/client": "6.2.0",
    "graphql": "16.9.0",
    "graphql-yoga": "5.10.7",
    "firebase": "11.1.0",
    "firebase-admin": "13.0.2",
    "@tanstack/react-query": "5.63.0",
    "zustand": "5.0.2",
    "three": "0.171.0",
    "zod": "3.24.1",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0",
    "lucide-react": "0.469.0"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "@types/node": "22.10.5",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "@types/three": "0.171.0",
    "prisma": "6.2.0",
    "vitest": "2.1.8",
    "@vitejs/plugin-react": "4.3.4",
    "jsdom": "25.0.1",
    "@testing-library/react": "16.1.0",
    "@testing-library/dom": "10.4.0",
    "@playwright/test": "1.49.1",
    "tailwindcss": "3.4.17",
    "postcss": "8.4.49",
    "autoprefixer": "10.4.20",
    "eslint": "9.17.0",
    "eslint-config-next": "15.1.0",
    "@typescript-eslint/eslint-plugin": "8.19.0",
    "@typescript-eslint/parser": "8.19.0",
    "prettier": "3.4.2",
    "prettier-plugin-tailwindcss": "0.6.9"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**.env.local.example**:
```bash
# Database (Docker PostgreSQL for local dev)
DATABASE_URL="postgresql://ancestral:localdev@localhost:5432/ancestral_vision"

# Firebase Client (public - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="ancestral-vision-dev.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="ancestral-vision-dev"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="ancestral-vision-dev.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"

# Firebase Emulator (for local development)
NEXT_PUBLIC_FIREBASE_USE_EMULATOR="true"
FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"

# Firebase Admin (server-side only - never expose)
FIREBASE_ADMIN_PROJECT_ID="ancestral-vision-dev"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@ancestral-vision-dev.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI (Google AI Studio for local dev, Vertex AI for production)
GOOGLE_AI_API_KEY="your-ai-studio-api-key"

# Environment
NODE_ENV="development"
```

### Step 0.1.3: Refactor

After tests pass:

1. Add detailed comments to configuration files
2. Create `.env.production.example` for production environment
3. Add `.nvmrc` with Node.js version
4. Update `.gitignore` if needed

---

## Implementation Details

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ancestral-vision-db
    environment:
      POSTGRES_USER: ancestral
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: ancestral_vision
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ancestral -d ancestral_vision"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // For Docker deployment
  experimental: {
    // Enable React 19 features
  },
  webpack: (config) => {
    // Required for Three.js
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

export default nextConfig;
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cosmic theme colors (to be refined)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
    },
  },
  plugins: [],
};

export default config;
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | CREATE | Project dependencies and scripts |
| `tsconfig.json` | CREATE | TypeScript configuration |
| `next.config.ts` | CREATE | Next.js configuration |
| `tailwind.config.ts` | CREATE | Tailwind CSS configuration |
| `postcss.config.mjs` | CREATE | PostCSS configuration |
| `vitest.config.ts` | CREATE | Vitest test configuration |
| `docker-compose.yml` | CREATE | Local PostgreSQL container |
| `.env.local.example` | CREATE | Development env template |
| `.env.production.example` | CREATE | Production env template |
| `.nvmrc` | CREATE | Node.js version |
| `.prettierrc` | CREATE | Prettier configuration |
| `.eslintrc.json` | CREATE | ESLint configuration |
| `tests/setup/config.test.ts` | CREATE | Configuration validation tests |
| `tests/setup.ts` | CREATE | Test setup file |
| `src/app/layout.tsx` | CREATE | Minimal root layout |
| `src/app/page.tsx` | CREATE | Minimal home page |
| `src/app/globals.css` | CREATE | Global styles with Tailwind |

---

## Verification

```bash
# Install dependencies
npm install

# Run configuration tests
npx vitest run tests/setup/config.test.ts

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Start dev server
npm run dev

# Start PostgreSQL
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] `npm run dev` starts Next.js at localhost:3000
- [ ] `npm run build` creates production build
- [ ] Docker PostgreSQL starts and accepts connections
- [ ] No `any` types in configuration files
- [ ] Environment variable templates complete
