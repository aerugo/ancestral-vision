# Phase 0.8: CI/CD & Deployment

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Configure Cloud Build CI/CD pipeline, create Docker container, and deploy to Cloud Run with Cloud SQL connection.

---

## Invariants Enforced in This Phase

- **INV-I001**: All merges to main trigger deployment to production
- **INV-I002**: CI must pass lint, typecheck, and tests before deploy
- **INV-I003**: Secrets stored in Secret Manager, never in code
- **INV-I004**: Database migrations run automatically on deploy

---

## TDD Steps

### Step 0.8.1: Write Failing Tests (RED)

Create `tests/integration/health.test.ts`:

**Test Cases**:

1. `it('should return 200 for health check')` - Health endpoint
2. `it('should include version in response')` - Version tracking

Create `tests/smoke/deployment.test.ts`:

**Test Cases**:

1. `it('should load landing page')` - Basic smoke test
2. `it('should connect to GraphQL endpoint')` - API smoke test

```typescript
// tests/integration/health.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Health Check', () => {
  let baseUrl: string;

  beforeAll(() => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  });

  it('should return 200 for health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
  });

  it('should include status in response', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    expect(data.status).toBe('healthy');
  });

  it('should include version in response', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    expect(data.version).toBeDefined();
  });

  it('should check database connectivity', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    expect(data.database).toBe('connected');
  });
});
```

```typescript
// tests/smoke/deployment.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Deployment Smoke Tests', () => {
  let baseUrl: string;

  beforeAll(() => {
    baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3000';
  });

  it('should load landing page', async () => {
    const response = await fetch(baseUrl);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Ancestral Vision');
  });

  it('should serve static assets', async () => {
    const response = await fetch(`${baseUrl}/_next/static/`);
    // 404 is expected for directory, but server should respond
    expect(response.status).toBeDefined();
  });

  it('should connect to GraphQL endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.__typename).toBe('Query');
  });
});
```

### Step 0.8.2: Implement to Pass Tests (GREEN)

**`src/app/api/health/route.ts`**:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const version = process.env.COMMIT_SHA || 'development';

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      version,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        version,
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

**`Dockerfile`**:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

**`cloudbuild.yaml`**:

```yaml
# cloudbuild.yaml
steps:
  # Install dependencies
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['ci']
    id: 'install'

  # Run linting
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'lint']
    id: 'lint'
    waitFor: ['install']

  # Run type checking
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'typecheck']
    id: 'typecheck'
    waitFor: ['install']

  # Run tests
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:run']
    env:
      - 'DATABASE_URL=postgresql://test:test@localhost:5432/test'
    id: 'test'
    waitFor: ['install']

  # Build Next.js application
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'build']
    id: 'build'
    waitFor: ['lint', 'typecheck', 'test']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:latest'
      - '--build-arg'
      - 'COMMIT_SHA=$COMMIT_SHA'
      - '.'
    id: 'docker-build'
    waitFor: ['build']

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api'
    id: 'docker-push'
    waitFor: ['docker-build']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'ancestral-vision-api'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '100'
      - '--memory'
      - '1Gi'
      - '--cpu'
      - '1'
      - '--timeout'
      - '300s'
      - '--set-env-vars'
      - 'NODE_ENV=production,COMMIT_SHA=$COMMIT_SHA'
      - '--set-secrets'
      - 'DATABASE_URL=DATABASE_URL:latest,FIREBASE_ADMIN_PROJECT_ID=FIREBASE_ADMIN_PROJECT_ID:latest,FIREBASE_ADMIN_CLIENT_EMAIL=FIREBASE_ADMIN_CLIENT_EMAIL:latest,FIREBASE_ADMIN_PRIVATE_KEY=FIREBASE_ADMIN_PRIVATE_KEY:latest'
      - '--add-cloudsql-instances'
      - '$PROJECT_ID:us-central1:ancestral-vision-db'
    id: 'deploy'
    waitFor: ['docker-push']

  # Run smoke tests against deployed service
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:smoke']
    env:
      - 'DEPLOYMENT_URL=https://ancestral-vision-api-$_SERVICE_URL'
    id: 'smoke-test'
    waitFor: ['deploy']

# Build options
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'

# Timeout for entire build
timeout: '1800s'

# Trigger on push to main branch
# (Configure via Cloud Console or gcloud)
# trigger:
#   branch: ^main$
#   includedFiles:
#     - 'src/**'
#     - 'package.json'
#     - 'prisma/**'
#     - 'Dockerfile'
```

**`.env.production.example`**:

```bash
# .env.production.example
# These are configured via Secret Manager and Cloud Run env vars

# Database (Cloud SQL via Unix socket)
DATABASE_URL="postgresql://user:pass@/ancestral_vision?host=/cloudsql/PROJECT:REGION:INSTANCE"

# Firebase Admin (from Secret Manager)
FIREBASE_ADMIN_PROJECT_ID="ancestral-vision-prod"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@ancestral-vision-prod.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Firebase Client (public, can be in code)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="ancestral-vision-prod.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="ancestral-vision-prod"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="ancestral-vision-prod.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Production settings
NODE_ENV="production"
NEXT_PUBLIC_FIREBASE_USE_EMULATOR="false"
```

**`next.config.ts`** (updated for standalone output):

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment

  experimental: {
    // Enable optimizations
  },

  webpack: (config) => {
    // Required for Three.js
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },

  // Environment variables available at build time
  env: {
    COMMIT_SHA: process.env.COMMIT_SHA || 'development',
  },
};

export default nextConfig;
```

### Step 0.8.3: Setup GCP Infrastructure

Run these commands to set up GCP (can be done manually or via Terraform):

```bash
# Set project
export PROJECT_ID="ancestral-vision-prod"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create ancestral-vision \
  --repository-format=docker \
  --location=us-central1

# Create Cloud SQL instance
gcloud sql instances create ancestral-vision-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-4096 \
  --region=us-central1 \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --availability-type=zonal

# Create database and user
gcloud sql databases create ancestral_vision --instance=ancestral-vision-db
gcloud sql users create ancestral --instance=ancestral-vision-db --password=SECURE_PASSWORD

# Create secrets in Secret Manager
echo -n "postgresql://ancestral:PASSWORD@/ancestral_vision?host=/cloudsql/$PROJECT_ID:us-central1:ancestral-vision-db" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Configure Cloud Build trigger (via Console is easier)
# Or use:
gcloud builds triggers create github \
  --name="deploy-main" \
  --repo-name="ancestral-vision" \
  --repo-owner="YOUR_GITHUB_USER" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `Dockerfile` | CREATE | Production container |
| `cloudbuild.yaml` | CREATE | CI/CD pipeline |
| `.dockerignore` | CREATE | Exclude files from build |
| `src/app/api/health/route.ts` | CREATE | Health check endpoint |
| `tests/integration/health.test.ts` | CREATE | Health check tests |
| `tests/smoke/deployment.test.ts` | CREATE | Deployment smoke tests |
| `.env.production.example` | CREATE | Production env template |
| `next.config.ts` | MODIFY | Add standalone output |

---

## Verification

```bash
# Build Docker image locally
docker build -t ancestral-vision:local .

# Run container locally
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  ancestral-vision:local

# Test health endpoint
curl http://localhost:8080/api/health

# Run integration tests locally
npm run test:integration

# Trigger Cloud Build manually
gcloud builds submit --config=cloudbuild.yaml

# Check deployment
gcloud run services describe ancestral-vision-api --region=us-central1

# Run smoke tests against deployed service
DEPLOYMENT_URL=https://your-service-url npm run test:smoke
```

---

## Completion Criteria

- [ ] Dockerfile builds successfully
- [ ] Health check endpoint returns 200
- [ ] Cloud Build pipeline completes
- [ ] Deploys to Cloud Run
- [ ] Database connects via Cloud SQL proxy
- [ ] Secrets retrieved from Secret Manager
- [ ] Smoke tests pass against deployed service
- [ ] CI runs lint, typecheck, tests before deploy
- [ ] INV-I001 through INV-I004 enforced by pipeline
