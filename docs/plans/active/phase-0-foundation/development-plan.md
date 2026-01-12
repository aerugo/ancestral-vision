# Phase 0: Foundation - Development Plan

**Status**: In Progress
**Created**: 2026-01-12
**Branch**: `feature/phase-0-foundation`
**Spec**: [spec.md](spec.md)

## Summary

Establish the complete technical foundation for Ancestral Vision: infrastructure, authentication, database, API, state management, and 3D rendering. This phase delivers a deployable "empty but working" application.

## Critical Invariants to Respect

Since this is the initial implementation, we are establishing invariants rather than respecting existing ones. However, the following principles from the project documentation guide our work:

- **From 07_technology_decisions.md**: Use WebGPU with WebGL fallback, TanStack Query + Zustand for state
- **From 08_data_model.md**: User ID is Firebase UID, all other IDs are UUID v4
- **From 10_security_privacy.md**: All API endpoints require auth except health/share
- **From 13_development.md**: Strict TDD, type safety, no `any` types

**New invariants to be established** (to be added to INVARIANTS.md after implementation):

- **NEW INV-D001**: Person IDs are globally unique UUIDs (v4)
- **NEW INV-D002**: User IDs are Firebase UIDs (string, not UUID)
- **NEW INV-D003**: Every Person belongs to exactly one Constellation
- **NEW INV-S001**: All GraphQL mutations require authenticated user
- **NEW INV-S002**: Users can only access their own Constellation
- **NEW INV-A001**: WebGPURenderer must be initialized with `await renderer.init()`
- **NEW INV-A002**: Use `renderer.setAnimationLoop()` not `requestAnimationFrame()`

## Current State Analysis

**What exists:**
- Planning documentation (14 documents in `docs/plans/grand_plan/`)
- Reference prototype: `reference_prototypes/family-constellations/` (~6,500 lines TypeScript)
- Reference prototype: `reference_prototypes/ancestral-synth/` (Python AI generation)
- 10 specialized Claude agents in `.claude/agents/`
- Git repository with 15 commits

**What does NOT exist:**
- Root `package.json`
- `src/` directory
- Prisma schema
- Next.js configuration
- Any implementation code
- Tests for main application

### Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Project dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.ts` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `postcss.config.mjs` | PostCSS configuration |
| `docker-compose.yml` | Local PostgreSQL |
| `firebase.json` | Firebase configuration |
| `.env.local.example` | Development env template |
| `.env.production.example` | Production env template |
| `Dockerfile` | Production container |
| `cloudbuild.yaml` | CI/CD pipeline |
| `prisma/schema.prisma` | Database schema |
| `src/app/layout.tsx` | Root layout |
| `src/app/page.tsx` | Landing page |
| `src/app/api/graphql/route.ts` | GraphQL endpoint |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/firebase.ts` | Firebase client config |
| `src/lib/firebase-admin.ts` | Firebase Admin SDK |
| `src/lib/auth.ts` | Auth utilities |
| `src/graphql/schema.ts` | GraphQL schema |
| `src/graphql/resolvers/` | GraphQL resolvers |
| `src/store/` | Zustand stores |
| `src/components/ui/` | shadcn/ui components |
| `src/components/providers/` | Context providers |
| `src/visualization/` | 3D rendering code |
| `src/types/` | TypeScript interfaces |

## Solution Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Ancestral Vision Architecture                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Browser                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Next.js App (React 19)                                              ││
│  │  ├─ TanStack Query (server state)                                   ││
│  │  ├─ Zustand (client state)                                          ││
│  │  ├─ shadcn/ui (components)                                          ││
│  │  └─ Three.js WebGPU (3D rendering)                                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              ↓ GraphQL                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                                      │
│  ├─ /api/graphql (GraphQL Yoga)                                         │
│  └─ Prisma Client                                                        │
│                              ↓                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Cloud SQL / Docker locally)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Monorepo approach**: Single Next.js application contains both frontend and API
2. **WebGPU-first**: Use Three.js WebGPURenderer with automatic WebGL fallback
3. **TDD from the start**: Every feature begins with failing tests
4. **Type-safe GraphQL**: Use code generation for end-to-end type safety
5. **Incremental complexity**: Start with minimal schema, expand in later phases

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 0.1 | Project Setup | Config validation | ~5 tests |
| 0.2 | Database & Prisma | Schema validation, migrations | ~10 tests |
| 0.3 | Firebase Auth | Auth flow, token validation | ~15 tests |
| 0.4 | GraphQL API | Resolvers, auth middleware | ~20 tests |
| 0.5 | State Management | Stores, hooks | ~10 tests |
| 0.6 | UI Foundation | Components, layouts | ~10 tests |
| 0.7 | 3D Foundation | Renderer, scene, controls | ~15 tests |
| 0.8 | CI/CD & Deployment | Build, deploy verification | ~5 tests |

**Total**: ~90 tests

---

## Phase 0.1: Project Setup

**Goal**: Initialize Next.js project with TypeScript, Tailwind, and development tooling
**Detailed Plan**: [phases/phase-0.1.md](phases/phase-0.1.md)

### Deliverables

1. `package.json` with all dependencies
2. TypeScript configuration (`tsconfig.json`)
3. Next.js 15+ with App Router
4. Tailwind CSS + PostCSS configuration
5. ESLint + Prettier configuration
6. Docker Compose for PostgreSQL
7. Environment variable templates

### TDD Approach

1. Write tests for environment validation
2. Implement configuration files to pass tests
3. Verify project builds and lints successfully

### Success Criteria

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts development server
- [ ] `npm run build` creates production build
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Docker PostgreSQL starts with `docker-compose up`

---

## Phase 0.2: Database & Prisma

**Goal**: Configure Prisma with PostgreSQL and create core schema
**Detailed Plan**: [phases/phase-0.2.md](phases/phase-0.2.md)

### Deliverables

1. Prisma schema with User, Constellation, Person entities
2. Database migrations
3. Prisma client singleton
4. Seed script for development data

### TDD Approach

1. Write tests for Prisma client connectivity
2. Write tests for schema constraints (unique, required fields)
3. Implement schema to pass tests

### Success Criteria

- [ ] `npx prisma migrate dev` runs successfully
- [ ] `npx prisma studio` opens database GUI
- [ ] Tests verify schema constraints
- [ ] Seed data creates test user with constellation

---

## Phase 0.3: Firebase Auth

**Goal**: Integrate Firebase Authentication with email/password
**Detailed Plan**: [phases/phase-0.3.md](phases/phase-0.3.md)

### Deliverables

1. Firebase client configuration
2. Firebase Admin SDK setup
3. Auth context provider
4. Login/Register pages
5. Auth middleware for API routes

### TDD Approach

1. Write tests for auth context (login, logout, register)
2. Write tests for token validation
3. Implement auth flow to pass tests

### Success Criteria

- [ ] Firebase Emulator runs locally
- [ ] Can register new user
- [ ] Can login/logout
- [ ] API routes reject unauthenticated requests
- [ ] Token validation works with Firebase Admin SDK

---

## Phase 0.4: GraphQL API

**Goal**: Create GraphQL API with Yoga and basic resolvers
**Detailed Plan**: [phases/phase-0.4.md](phases/phase-0.4.md)

### Deliverables

1. GraphQL Yoga server at `/api/graphql`
2. Schema with User, Constellation, Person types
3. Queries: `me`, `constellation`, `person`
4. Mutations: `createConstellation`, `createPerson`
5. Auth middleware (verify Firebase token)
6. Prisma integration in resolvers

### TDD Approach

1. Write tests for each resolver
2. Write tests for auth middleware
3. Implement resolvers to pass tests

### Success Criteria

- [ ] GraphQL playground accessible at `/api/graphql`
- [ ] `me` query returns current user
- [ ] Mutations require authentication
- [ ] Type-safe with generated types

---

## Phase 0.5: State Management

**Goal**: Configure TanStack Query and Zustand stores
**Detailed Plan**: [phases/phase-0.5.md](phases/phase-0.5.md)

### Deliverables

1. TanStack Query provider and configuration
2. GraphQL client with auth headers
3. Zustand stores: `useAuthStore`, `useUIStore`, `useConstellationStore`
4. Custom hooks: `useMe`, `useConstellation`

### TDD Approach

1. Write tests for Zustand stores
2. Write tests for query hooks
3. Implement stores and hooks to pass tests

### Success Criteria

- [ ] Auth state persists across page refreshes
- [ ] GraphQL queries include auth token
- [ ] UI state (theme, selected person) managed correctly
- [ ] Type-safe store access

---

## Phase 0.6: UI Foundation

**Goal**: Set up shadcn/ui and create base layouts
**Detailed Plan**: [phases/phase-0.6.md](phases/phase-0.6.md)

### Deliverables

1. shadcn/ui initialization with cosmic theme
2. Root layout with providers
3. Landing page (placeholder)
4. Auth pages (login, register)
5. App shell with navigation
6. 3D canvas container component

### TDD Approach

1. Write component tests with Testing Library
2. Write accessibility tests
3. Implement components to pass tests

### Success Criteria

- [ ] Components render without errors
- [ ] Dark theme applied by default
- [ ] Auth pages functional
- [ ] 3D canvas mounts correctly
- [ ] Basic accessibility tests pass

---

## Phase 0.7: 3D Foundation

**Goal**: Integrate Three.js with WebGPU renderer and basic controls
**Detailed Plan**: [phases/phase-0.7.md](phases/phase-0.7.md)

### Deliverables

1. WebGPU renderer with WebGL fallback
2. Scene setup with camera
3. Orbit controls
4. Placeholder constellation (static spheres)
5. Animation loop with `setAnimationLoop`
6. Render quality detection

### TDD Approach

1. Write tests for renderer initialization
2. Write tests for WebGPU/WebGL detection
3. Write tests for scene components
4. Implement 3D system to pass tests

### Success Criteria

- [ ] WebGPU renderer initializes (or falls back to WebGL)
- [ ] Camera controls work (orbit, zoom, pan)
- [ ] Placeholder constellation renders
- [ ] 60fps performance on desktop
- [ ] No memory leaks on unmount

---

## Phase 0.8: CI/CD & Deployment

**Goal**: Configure Cloud Build and deploy to Cloud Run
**Detailed Plan**: [phases/phase-0.8.md](phases/phase-0.8.md)

### Deliverables

1. Dockerfile for production
2. `cloudbuild.yaml` configuration
3. Cloud Run service configuration
4. Secret Manager setup
5. Cloud SQL connection
6. Health check endpoint

### TDD Approach

1. Write integration tests for health check
2. Write smoke tests for deployment
3. Verify CI pipeline runs all checks

### Success Criteria

- [ ] Push to main triggers Cloud Build
- [ ] CI runs lint, typecheck, test
- [ ] Docker image builds successfully
- [ ] Deploys to Cloud Run
- [ ] Health check returns 200
- [ ] Database connects via Cloud SQL proxy

---

## Testing Strategy

### Unit Tests (co-located with source)

| File | What it tests |
|------|---------------|
| `src/lib/prisma.test.ts` | Database connectivity |
| `src/lib/auth.test.ts` | Auth utilities |
| `src/graphql/resolvers/*.test.ts` | Individual resolvers |
| `src/store/*.test.ts` | Zustand stores |
| `src/visualization/*.test.ts` | 3D components |

### Integration Tests

| File | What it tests |
|------|---------------|
| `tests/integration/auth.test.ts` | Full auth flow |
| `tests/integration/api.test.ts` | GraphQL API with auth |

### E2E Tests (Phase 0.8)

| File | What it tests |
|------|---------------|
| `tests/e2e/landing.spec.ts` | Landing page loads |
| `tests/e2e/auth.spec.ts` | Login/register flow |

---

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Create with initial invariants (INV-D001-D003, INV-S001-S002, INV-A001-A002)
- [ ] `docs/invariants/data.md` - Data model invariants
- [ ] `docs/invariants/security.md` - Security invariants
- [ ] `docs/invariants/architecture.md` - Architecture invariants
- [ ] `README.md` - Update with setup instructions

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 0.1 | Pending | | | Project Setup |
| Phase 0.2 | Pending | | | Database & Prisma |
| Phase 0.3 | Pending | | | Firebase Auth |
| Phase 0.4 | Pending | | | GraphQL API |
| Phase 0.5 | Pending | | | State Management |
| Phase 0.6 | Pending | | | UI Foundation |
| Phase 0.7 | Pending | | | 3D Foundation |
| Phase 0.8 | Pending | | | CI/CD & Deployment |

---

## Technical References

- **Tech Stack**: [07_technology_decisions.md](../../grand_plan/07_technology_decisions.md)
- **Data Model**: [08_data_model.md](../../grand_plan/08_data_model.md)
- **API Spec**: [09_api_specification.md](../../grand_plan/09_api_specification.md)
- **Security**: [10_security_privacy.md](../../grand_plan/10_security_privacy.md)
- **Deployment**: [11_deployment_operations.md](../../grand_plan/11_deployment_operations.md)
- **Roadmap**: [12_roadmap.md](../../grand_plan/12_roadmap.md)
- **Development**: [13_development.md](../../grand_plan/13_development.md)
- **3D Prototype**: `reference_prototypes/family-constellations/`

---

## Prerequisites: GCP & MCP Setup

Before AI agents can deploy and test autonomously, complete the manual setup in:

- **[gcp-mcp-setup.md](gcp-mcp-setup.md)** - GCP infrastructure and MCP server configuration

This includes:
1. Creating GCP projects (dev and prod)
2. Setting up AI agent service account with appropriate permissions
3. Bootstrapping Cloud SQL, Cloud Storage, Secret Manager
4. Configuring Firebase project and authentication
5. Setting up Cloud Build triggers
6. Configuring MCP servers for Claude Code

**Time Required**: ~1-2 hours of manual setup

See [mcp-config-example.json](mcp-config-example.json) for the MCP server configuration to add to Claude Code settings.
