# Ancestral Vision: Technology Decisions

> **Status**: IMPLEMENTED - All decisions resolved and implemented (except AI/Billing)
> **Updated**: 2026-01-18

This document tracks all technology decisions for Ancestral Vision.

---

## Decision Status Legend

| Status | Meaning |
|--------|---------|
| DECIDED | Decision made, rationale documented |
| PENDING | Awaiting decision |
| BLOCKED | Waiting on dependent decision |

---

## Pre-Decided Technology Choices

These decisions were made upfront:

### AI/ML Stack

| Component | Decision | Status | Rationale |
|-----------|----------|--------|-----------|
| LLM Provider | **Google Gemini** | DECIDED | Unified Google ecosystem, cost, capability |
| Image Generation | **Google Imagen** | DECIDED | Unified Google ecosystem |
| Speech-to-Text | **Google Speech-to-Text V2 (Chirp 3)** | DECIDED | Best-in-class accuracy, diarization, Google ecosystem |

### Infrastructure

| Component | Decision | Status | Rationale |
|-----------|----------|--------|-----------|
| Cloud Platform | **Google Cloud** | DECIDED | LLM vendor alignment, managed services |

---

## Frontend Decisions

### F1: Frontend Framework

**Status**: DECIDED

**Decision**: **React**

**Rationale**:
- Largest ecosystem and hiring pool
- Best Three.js integration via react-three-fiber ecosystem
- Mature, battle-tested
- Strong TypeScript support

---

### F2: Meta-Framework / Build System

**Status**: DECIDED

**Decision**: **Next.js**

**Rationale**:
- Full-featured framework (SSR, SSG, API routes)
- Excellent developer experience
- Can do SSR for marketing pages, client-side for the app
- API routes simplify initial backend setup
- Great deployment support on Cloud Run

---

### F3: State Management

**Status**: DECIDED

**Decision**: **TanStack Query + Zustand**

**Rationale**:
- TanStack Query (React Query) handles server state (API data) with caching, refetching, optimistic updates
- Zustand handles client/UI state (selected person, panel state, theme)
- Both are production-grade, widely used (Google, PayPal, Microsoft use TanStack Query)
- Zustand from same team as react-three-fiber (Poimandres)
- Cleaner separation than Redux for this use case

---

### F4: CSS/Styling Approach

**Status**: DECIDED

**Decision**: **Tailwind CSS**

**Rationale**:
- Utility-first enables rapid development
- Built-in support in Next.js
- Dominant choice in React/Next.js ecosystem
- Works perfectly with shadcn/ui

---

### F5: Component Library

**Status**: DECIDED

**Decision**: **shadcn/ui**

**Rationale**:
- Built on Radix UI primitives (accessibility)
- Tailwind-based styling
- Copy-paste components you own and can customize
- Not a dependency - full control over code
- Will be themed to match cosmic/manuscript aesthetic

---

### F6: Rich Text Editor

**Status**: DECIDED

**Decision**: **Tiptap**

**Rationale**:
- Headless architecture fits with shadcn/ui (build custom UI)
- Built on ProseMirror (battle-tested foundation)
- Excellent React and TypeScript support
- Easy to extend with custom features
- Most popular modern React editor (good AI training data)
- shadcn/ui has Tiptap-based components

**Use cases**:
- Notes about people (US-3.1)
- Event descriptions
- Biography editing

---

### F7: 3D Technology

**Status**: DECIDED → **IMPLEMENTED**

**Decision**: **WebGPU only** (WebGL fallback deprecated)

**Rationale**:
- WebGPU enables 10x particle performance via compute shaders
- TSL (Three.js Shading Language) compiles to both WGSL and GLSL
- Browser support mature in 2026 (Chrome, Edge, Firefox, Safari)
- Aligns with existing visual-modernization-plan.md
- Positions Ancestral Vision as a WebGPU showcase project

**Implementation Notes**:
- Three.js 0.182.0 with `three/webgpu` imports
- All materials written in TSL (`src/visualization/materials/`)
- WebGL fallback was initially planned but deprecated for simplicity
- Post-processing via TSL pipeline (`src/visualization/tsl-pipeline/`)

---

## Backend Decisions

### B1: API Architecture Style

**Status**: DECIDED

**Decision**: **GraphQL**

**Rationale**:
- Perfect for nested relational data (family trees are graphs)
- Single query can fetch person with ancestors, events, notes
- Flexible - each view requests exactly what it needs
- Built-in subscriptions for real-time features
- Schema serves as documentation
- Type-safe with code generation

---

### B2: Backend Runtime / Framework

**Status**: DECIDED

**Decision**: **Next.js API Routes + GraphQL Yoga**

**Rationale**:
- All-in-one architecture (frontend + API in single codebase)
- GraphQL Yoga is lighter than Apollo Server
- Built by The Guild (GraphQL tooling experts)
- Works great in Next.js serverless/edge environment
- Simple deployment to Cloud Run
- Can extract to separate backend later if needed

---

### B3: Primary Database

**Status**: DECIDED

**Decision**: **Cloud SQL (PostgreSQL) + Prisma**

**Rationale**:
- PostgreSQL recursive CTEs handle ancestry queries elegantly
- ACID compliance for data integrity
- Mature, well-documented
- Prisma provides excellent TypeScript DX
- Cloud SQL is Google-managed (backups, maintenance)
- Full-text search built-in via pg_trgm

---

### B4: Graph Database Need

**Status**: DECIDED

**Decision**: **No dedicated graph database**

**Rationale**:
- PostgreSQL recursive CTEs handle ancestor/descendant queries
- Avoids operational complexity of second database
- Can add Neo4j later if query patterns demand it
- Thousands of people scale fine with PostgreSQL

---

### B5: Search Solution

**Status**: DECIDED

**Decision**: **PostgreSQL full-text search**

**Rationale**:
- No extra service to manage
- Built-in `pg_trgm` extension for fuzzy/typo-tolerant matching
- Sufficient for people name search and note search
- Can upgrade to Algolia/Meilisearch later if search becomes critical

---

### B6: Real-time Technology

**Status**: DECIDED

**Decision**: **GraphQL Subscriptions**

**Rationale**:
- Native to GraphQL (consistent paradigm)
- GraphQL Yoga supports subscriptions out of the box
- Handles match notifications, collaborative updates
- Can add Redis pub/sub for multi-instance scaling later

---

## Authentication & Authorization

### A1: Authentication Provider

**Status**: DECIDED

**Decision**: **Firebase Auth**

**Rationale**:
- Google-native (fits GCP stack)
- Free up to 50k monthly active users
- Social login (Google, Apple) built-in
- Easy integration with Next.js
- Proven at scale

---

### A2: Authorization Model

**Status**: DECIDED

**Decision**: **Hybrid (Ownership + Resource Privacy)**

**Rationale**:
- Simple mental model: owner has full access
- Resource-level privacy (private, connections, public)
- No complex role hierarchies needed
- Supports sharing with connections and matched users
- Easy to reason about and implement

**Implementation pattern**:
```typescript
canAccess(user, resource) {
  if (resource.ownerId === user.id) return true;
  if (resource.privacy === 'public') return true;
  if (resource.privacy === 'connections' && isConnected(user, resource.owner)) return true;
  return false;
}
```

---

## Payment Processing

### P1: Payment Provider

**Status**: DECIDED

**Decision**: **LemonSqueezy**

**Rationale**:
- Merchant of Record (MoR) model - they handle all tax compliance
- EU VAT, US sales tax, and global taxes handled automatically
- No need to file or remit taxes ourselves
- Modern API with good Next.js/TypeScript support
- Webhooks for subscription lifecycle events
- Customer portal for self-service billing management
- Higher fee (~5% + $0.50) worth it for tax peace of mind

**Implementation pattern**:
- LemonSqueezy Checkout for payment pages
- LemonSqueezy Customer Portal for billing management
- Webhook handlers for subscription events:
  - `subscription_created` - activate premium
  - `subscription_updated` - handle plan changes
  - `subscription_cancelled` - downgrade to free
  - `subscription_payment_failed` - notify user, grace period

**Alternatives considered**:
- Stripe: Lower fees but requires handling tax compliance ourselves
- Paddle: Similar MoR model but higher fees and more enterprise-focused

---

## AI Integration

### AI1: Gemini Integration Method

**Status**: DECIDED

**Decision**: **Vertex AI**

**Rationale**:
- Managed platform with monitoring and logging
- Model versioning and rollback
- Quota management built-in
- Enterprise-ready
- Same Gemini models, just managed
- Fits all-Google strategy

---

### AI2: Agent Framework / SDK

**Status**: DECIDED

**Decision**: **Genkit**

**Rationale**:
- Google's AI framework, purpose-built for Vertex AI
- Native Gemini integration
- Structured output with Zod schemas
- Flows (agents) with observability built-in
- Works great with Next.js and TypeScript
- Actively maintained by Google

---

### AI3: Prompt Management

**Status**: DECIDED

**Decision**: **Vertex AI Prompt Management**

**Rationale**:
- Free (no additional cost over Vertex AI usage)
- Cloud-stored prompts (edit without deploy)
- Version history
- Team collaboration
- Stays within Google ecosystem
- Integrates with Genkit

---

### AI4: Speech-to-Text

**Status**: DECIDED

**Decision**: **Google Speech-to-Text V2 (Chirp 3)**

**Rationale**:
- Best-in-class transcription accuracy (9.8% WER on benchmarks)
- Speaker diarization now supported (new in Chirp 3)
- Automatic language detection
- 12x faster than self-hosted Whisper
- Managed service (no GPU infrastructure)
- Google ecosystem consistency
- Cost-effective at scale

**Use cases**:
- Audio transcription with speaker labels (US-3.3)
- Oral history recordings with multiple speakers
- Interview transcriptions

**Features**:
- Speaker diarization (identify who said what)
- Word-level timestamps
- Automatic punctuation
- 125+ languages supported

**Alternatives considered**:
- WhisperX (Whisper + pyannote): Slightly better diarization but requires GPU infrastructure
- AssemblyAI: Good but adds another vendor
- OpenAI Whisper API: No native diarization

---

## Infrastructure & Operations

### I1: Compute Platform

**Status**: DECIDED

**Decision**: **Cloud Run**

**Rationale**:
- Deploys Next.js containers easily
- Auto-scales (including to zero in dev/staging)
- Supports WebSockets for GraphQL subscriptions
- Pay only for what you use
- Cold starts mitigated with `min-instances: 1` in production
- Simpler than Kubernetes, more flexible than App Engine

---

### I2: CDN Strategy

**Status**: DECIDED

**Decision**: **Cloud CDN**

**Rationale**:
- Google-native (keeps all infrastructure in GCP)
- Integrates with Cloud Load Balancing
- Simplifies vendor management
- One fewer external account to manage

---

### I3: Observability Stack

**Status**: DECIDED

**Decision**: **Cloud Logging + Cloud Monitoring + Cloud Error Reporting**

**Rationale**:
- All-Google stack (single console, single billing)
- Automatic integration with Cloud Run
- No extra accounts or vendors
- Cloud Logging: automatic log ingestion
- Cloud Monitoring: dashboards, alerts, uptime checks
- Cloud Error Reporting: automatic error grouping, stack traces
- Can add Sentry later if error tracking needs improvement

---

### I4: File/Media Storage

**Status**: DECIDED

**Decision**: **Cloud Storage (GCS)**

**Rationale**:
- Google-native (fits all-Google strategy)
- Integrates with Cloud CDN for fast delivery
- Signed URLs for secure direct uploads/downloads
- Lifecycle policies for cost optimization
- IAM integration for access control
- Local filesystem fallback for development

**Use cases**:
- Person photos (US-2.3)
- Audio recordings (US-3.2)
- Documents - PDFs, scanned images (US-3.6)

**Implementation pattern**:
```typescript
// Upload: Generate signed URL, client uploads directly to GCS
// Download: Serve via Cloud CDN with signed URLs for private content
// Development: Local filesystem with same API abstraction
```

---

### I5: Email Service

**Status**: DECIDED

**Decision**: **Resend**

**Rationale**:
- Modern API designed for Next.js/React
- React Email for building templates in JSX/TSX
- Simple integration with excellent TypeScript support
- 3,000 emails/month free tier (sufficient for early stage)
- Good deliverability
- Clean developer experience

**Use cases**:
- Password reset emails (US-1.7)
- Payment failure notifications (US-10.4)
- Connection request notifications (US-7.1)

**Implementation pattern**:
```typescript
import { Resend } from 'resend';
import { PasswordResetEmail } from '@/emails/password-reset';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Ancestral Vision <noreply@ancestralvision.com>',
  to: user.email,
  subject: 'Reset your password',
  react: PasswordResetEmail({ resetUrl, userName }),
});
```

---

## Testing Strategy

### T1: Unit Testing Framework

**Status**: DECIDED

**Decision**: **Vitest**

**Rationale**:
- Fast, modern test runner
- Vite-native (great ESM support)
- Excellent developer experience
- Already used in existing prototype
- Works great with Next.js

---

### T2: E2E Testing Framework

**Status**: DECIDED

**Decision**: **Playwright**

**Rationale**:
- Fast execution
- Multi-browser (Chrome, Firefox, Safari in one run)
- Great API and debugging tools
- Better for CI/CD pipelines
- Visual regression testing support (useful for 3D)
- Microsoft-backed, actively developed

---

## Local Development Setup

### Development Environment Overview

| Production Service | Local Development |
|-------------------|-------------------|
| Cloud Run | `next dev` (built-in dev server) |
| Cloud SQL (PostgreSQL) | Docker PostgreSQL |
| GraphQL Yoga | Runs in Next.js (built-in) |
| Firebase Auth | Firebase Emulator |
| Vertex AI / Gemini | Google AI Studio API |
| Cloud Storage | Local filesystem |
| Cloud CDN | Not needed locally |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT                                           │
├─────────────────────────────────────────────────────────────┤
│  next dev (localhost:3000)                                  │
│    ├── React frontend                                       │
│    ├── GraphQL API (/api/graphql)                          │
│    └── Genkit AI flows                                      │
├─────────────────────────────────────────────────────────────┤
│  Docker Compose                                              │
│    └── PostgreSQL (localhost:5432)                         │
├─────────────────────────────────────────────────────────────┤
│  Firebase Emulator (localhost:9099)                         │
│    └── Auth emulation                                       │
├─────────────────────────────────────────────────────────────┤
│  External (real services)                                   │
│    └── Google AI Studio API (for AI during dev)            │
└─────────────────────────────────────────────────────────────┘
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: ancestral
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: ancestral_vision
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Environment Variables

**.env.local** (development):
```bash
# Database
DATABASE_URL="postgresql://ancestral:localdev@localhost:5432/ancestral_vision"

# Firebase (emulator)
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true
FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"

# Google AI (use AI Studio for dev - simpler than Vertex)
GOOGLE_AI_API_KEY="your-ai-studio-key"

# File storage (local)
STORAGE_TYPE="local"
LOCAL_STORAGE_PATH="./uploads"

# Environment
NODE_ENV="development"
```

**.env.production** (deployment):
```bash
# Database
DATABASE_URL="postgresql://user:pass@/ancestral?host=/cloudsql/project:region:instance"

# Firebase (real)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."

# Vertex AI (production)
GOOGLE_CLOUD_PROJECT="your-project"
VERTEX_AI_LOCATION="us-central1"

# Cloud Storage
STORAGE_TYPE="gcs"
GCS_BUCKET="ancestral-vision-media"
```

### AI Development Strategy

Use **Google AI Studio** during development instead of Vertex AI:
- Same Gemini models
- Simpler API (just an API key)
- Free tier available
- Switch to Vertex AI for production

```typescript
// lib/ai.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    process.env.NODE_ENV === 'production'
      ? vertexAI({ project: process.env.GOOGLE_CLOUD_PROJECT })
      : googleAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
  ]
});
```

### Development Commands

```bash
# Start PostgreSQL
docker-compose up -d

# Start Firebase emulator
firebase emulators:start --only auth

# Run database migrations
npx prisma migrate dev

# Start Next.js dev server
npm run dev

# All-in-one (using concurrently)
npm run dev:full
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:start": "docker-compose up -d",
    "db:stop": "docker-compose down",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "emulators": "firebase emulators:start --only auth",
    "dev:full": "concurrently \"npm run db:start\" \"npm run emulators\" \"npm run dev\"",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

### Development Cost

| Service | Development Cost |
|---------|------------------|
| Next.js dev server | Free (local) |
| PostgreSQL | Free (Docker) |
| Firebase Auth | Free (emulator) |
| Google AI Studio | Free tier, then ~$0.01/request |
| File storage | Free (local filesystem) |

**Total: $0-5/month** (only AI API calls cost money)

---

## Summary: Complete Tech Stack

### Frontend
| Layer | Technology | Version | Implemented |
|-------|------------|---------|-------------|
| Framework | React | 19.2.3 | ✅ |
| Meta-Framework | Next.js | 16.1.1 | ✅ |
| State (Server) | TanStack Query | 5.90.16 | ✅ |
| State (Client) | Zustand | 5.0.10 | ✅ |
| Styling | Tailwind CSS | 4.1.18 | ✅ |
| Components | shadcn/ui (Radix) | Latest | ✅ |
| Rich Text | Tiptap | 3.15.3 | ✅ |
| 3D Rendering | Three.js WebGPU (TSL) | 0.182.0 | ✅ |

### Backend
| Layer | Technology | Version | Implemented |
|-------|------------|---------|-------------|
| API | GraphQL Yoga | 5.18.0 | ✅ |
| Runtime | Next.js API Routes | 16.1.1 | ✅ |
| Database | PostgreSQL (Cloud SQL) | 16 | ✅ |
| ORM | Prisma | 6.19.1 | ✅ |
| Search | PostgreSQL full-text (pg_trgm) | - | ✅ |
| Real-time | GraphQL Subscriptions | - | ⚠️ Schema ready |

### Auth, Payments & AI
| Layer | Technology | Version | Implemented |
|-------|------------|---------|-------------|
| Authentication | Firebase Auth | 12.7.0 | ✅ |
| Authorization | Ownership + Resource Privacy | - | ✅ |
| Payments | LemonSqueezy (MoR) | - | ❌ Not started |
| AI Platform | Vertex AI | - | ❌ Not started |
| AI Framework | Genkit | - | ❌ Not started |
| Prompts | Vertex AI Prompt Management | - | ❌ Not started |
| Speech-to-Text | Google Chirp 3 | - | ❌ Not started |

### Infrastructure
| Layer | Technology | Implemented |
|-------|------------|-------------|
| Compute | Cloud Run | ✅ |
| File Storage | Cloud Storage (GCS) | ✅ Configured |
| Email | Resend | ❌ Not started |
| CDN | Cloud CDN | ⚠️ Configured |
| Logging | Cloud Logging | ✅ |
| Monitoring | Cloud Monitoring | ✅ |
| Errors | Cloud Error Reporting | ✅ |

### Testing
| Layer | Technology | Version | Implemented |
|-------|------------|---------|-------------|
| Unit Tests | Vitest | 4.0.17 | ✅ (103 test files) |
| E2E Tests | Playwright | - | ⚠️ Configured |

### Local Development
| Layer | Technology | Implemented |
|-------|------------|-------------|
| Database | Docker PostgreSQL | ✅ |
| Auth | Firebase Emulator | ✅ |
| AI | Google AI Studio API | ❌ Not configured |
| Storage | Local filesystem | ✅ |

---

*Status: Implemented - All core decisions in production, AI/Billing pending - Updated 2026-01-18*
