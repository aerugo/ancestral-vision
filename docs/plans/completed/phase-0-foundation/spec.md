# Feature: Phase 0 - Foundation

**Status**: Draft
**Created**: 2026-01-12
**User Stories**: US-1.1 (partial - auth infrastructure), US-1.7 (Password Reset)

## Goal

Establish the complete technical foundation for Ancestral Vision including infrastructure, authentication, database schema, API layer, and 3D rendering capabilities.

## Background

Ancestral Vision is a 3D family tree visualization platform. Before building user-facing features, we need a solid foundation:

- **No code exists yet**: The codebase contains only planning documentation and reference prototypes
- **Reference prototypes available**: `family-constellations` (TypeScript/Three.js 3D engine) and `ancestral-synth` (Python AI generation)
- **Tech stack decided**: Next.js 15+, React 19, GraphQL Yoga, Prisma, PostgreSQL, Firebase Auth, Three.js WebGPU
- **Infrastructure planned**: GCP (Cloud Run, Cloud SQL, Cloud Storage)

Phase 0 creates the "empty but working" application that subsequent phases will build upon.

## Acceptance Criteria

### Infrastructure
- [ ] AC1: GCP projects created (ancestral-vision-dev, ancestral-vision-prod)
- [ ] AC2: Cloud Run service configured and deployable
- [ ] AC3: Cloud SQL PostgreSQL provisioned in dev environment
- [ ] AC4: Cloud Storage buckets created for media storage
- [ ] AC5: Secret Manager populated with required secrets
- [ ] AC6: Cloud Build CI/CD pipeline operational (push to main deploys to prod)

### Development Environment
- [ ] AC7: Docker Compose starts local PostgreSQL with `docker-compose up`
- [ ] AC8: Firebase Emulator runs authentication locally
- [ ] AC9: Environment variables documented (.env.local.example, .env.production.example)
- [ ] AC10: npm scripts work: `dev`, `build`, `test`, `lint`, `typecheck`

### Application Foundation
- [ ] AC11: Next.js 15+ app with App Router scaffold created
- [ ] AC12: GraphQL Yoga API route operational at `/api/graphql`
- [ ] AC13: GraphQL playground accessible in development
- [ ] AC14: Prisma schema v1 with core entities (User, Constellation, Person)
- [ ] AC15: Database migrations run successfully
- [ ] AC16: Firebase Auth integration working (register, login, logout)
- [ ] AC17: TanStack Query configured for server state
- [ ] AC18: Zustand configured for client state
- [ ] AC19: Tailwind CSS + shadcn/ui component library configured

### 3D Foundation
- [ ] AC20: Three.js integrated with WebGPU renderer
- [ ] AC21: WebGL fallback works for browsers without WebGPU
- [ ] AC22: Basic scene renders with placeholder constellation data
- [ ] AC23: Camera controls operational (orbit, zoom, pan)
- [ ] AC24: `renderer.setAnimationLoop()` used (not `requestAnimationFrame`)

### Definition of Done
- [ ] AC25: Can register, login, logout via Firebase Auth
- [ ] AC26: Can deploy to Cloud Run (dev environment)
- [ ] AC27: Basic 3D scene renders with placeholder constellation
- [ ] AC28: GraphQL playground accessible at /api/graphql
- [ ] AC29: All CI checks pass (lint, typecheck, test)

## Technical Requirements

### Database Changes

Create initial Prisma schema with core entities:

**User**: Firebase UID, email, displayName, preferences (JSON), subscription (JSON)
**Constellation**: UUID, ownerId, title, personCount
**Person**: UUID, constellationId, givenName, surname, patronymic, nameOrder, speculative, deletedAt

Full schema detailed in [08_data_model.md](../../grand_plan/08_data_model.md).

### API Changes

Initial GraphQL schema with:
- Query: `me`, `constellation`, `person`
- Mutation: `createConstellation`, `createPerson`
- Types: User, Constellation, Person

### UI Changes

- Landing page (placeholder)
- Login/Register pages with Firebase Auth
- Main app shell with 3D canvas
- Placeholder constellation visualization

## Dependencies

- GCP account with billing enabled
- Firebase project created
- Domain configured (ancestralvision.com)
- Google AI Studio API key (for development AI testing)

## Out of Scope

- Full onboarding wizard (Phase 1)
- Person CRUD beyond basic creation (Phase 1)
- Notes, Events, Media (Phase 1)
- AI features (Phase 2)
- Social features (Phase 3)
- Advanced 3D features (Phase 4)

## Security Considerations

- Firebase Auth handles authentication securely
- All API endpoints require authentication except health check
- Database credentials stored in Secret Manager
- Environment variables never committed to git
- HTTPS enforced in production

## Open Questions

- [x] Q1: Which GCP region? **Decision**: us-central1 (per 11_deployment_operations.md)
- [x] Q2: Domain setup order? **Decision**: Domain can be configured after initial deployment
- [x] Q3: AI API key for dev? **Decision**: Use Google AI Studio API key (per 07_technology_decisions.md)
