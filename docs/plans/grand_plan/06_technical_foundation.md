# Ancestral Vision: Technical Foundation

> **Status**: IMPLEMENTATION COMPLETE - Updated 2026-01-18

This document describes the technical foundation of Ancestral Vision, including the production implementation and reference prototypes.

---

## Current Implementation

The production codebase is in `src/` with the following architecture:

| Component | Location | Technology | Status |
|-----------|----------|------------|--------|
| Visualization | `src/visualization/` | Three.js + WebGPU (TSL) | ✅ **Production** |
| GraphQL API | `src/graphql/` | GraphQL Yoga | ✅ **Production** |
| React Components | `src/components/` | Next.js 16 + React 19 | ✅ **Production** |
| State Management | `src/store/` | Zustand | ✅ **Production** |
| Database | `prisma/schema.prisma` | Prisma + PostgreSQL | ✅ **Production** |
| AI Flows | `src/ai/` | Genkit | ❌ **Not Started** |

## Reference Prototypes

| Codebase | Location | Language | Purpose |
|----------|----------|----------|---------|
| 3D Constellation | `reference_prototypes/family-constellations/` | TypeScript | Original prototype (superseded) |
| AI Genealogy | `reference_prototypes/ancestral-synth/` | Python | AI patterns to port to Genkit |

---

## 6.1 Production Visualization System (`src/visualization/`)

### Stack (Current Production)
- **TypeScript** (5.9.3) with strict mode
- **Three.js** (0.182.0) with WebGPU (TSL shaders)
- **Next.js** (16.1.1) for build/server
- **Vitest** (4.0.17) for testing

### Architecture

```
src/visualization/
├── instanced-constellation.ts   # Main constellation rendering
├── constellation-pool.ts        # Object pooling for performance
├── family-graph.ts              # Graph data structure
├── force-directed-layout.ts     # Force-directed positioning
├── barnes-hut.ts                # Barnes-Hut optimization
├── selection.ts                 # Selection and highlighting
├── camera-animation.ts          # Camera reveal animations
├── materials/
│   ├── node-material.ts         # TSL node material
│   ├── ghost-node-material.ts   # Speculative person material
│   ├── edge-material.ts         # Connection lines
│   ├── tsl-cloud-material.ts    # Cloud effect with biography scaling
│   └── palette.ts               # 5-color system
├── animation/
│   ├── core/                    # AnimationSystem, TimeProvider, EventBus
│   ├── reactive/                # Reactive attribute bindings
│   ├── transitions/             # Timeline and transition management
│   ├── loops/                   # Shader loop registry
│   ├── propagation/             # Cascading animation effects
│   └── integration/             # React hooks (use-animation-system.ts)
├── particles/                   # Background particles, fireflies
├── effects/                     # Sacred geometry grid
├── tsl-pipeline/                # Post-processing with performance tiers
├── path-pulse/                  # Path pulse animations
└── biography-transition/        # Biography reveal metamorphosis
```

**Total**: ~21,700 lines of TypeScript (mature, production-quality)

### Key Components (Production)

#### InstancedConstellation
- WebGPU-only rendering via `WebGPURenderer`
- Instanced mesh management for 1000+ nodes
- Real-time incremental updates
- Integration with object pooling system

#### ConstellationPool
- Game engine-style object pooling
- Hot-swappable constellation updates
- Typed pool returns for nodes, edges, particles

#### Animation System
- Central `AnimationSystem` with event bus architecture
- Reactive attribute bindings (similar to reactive frameworks)
- Biography-to-ghost transitions with reverse capability
- Sphere shell particles for dissolution effects
- A/B testing infrastructure for animation modes

#### TSL Materials (WebGPU)
- `node-material.ts`: Main star nodes with biography weight scaling
- `ghost-node-material.ts`: Translucent speculative people
- `tsl-cloud-material.ts`: Cloud corona effects
- `edge-material.ts`: Family connection lines

### Data Flow (Production)

```
GraphQL API (React Query)
    ↓
Zustand Store (selection, UI state)
    ↓
FamilyGraph → nodes, edges, generations
    ↓
ForceDirectedLayout → 3D positions
    ↓
ConstellationPool → pooled mesh instances
    ↓
InstancedConstellation → WebGPU scene
    ↓
TSL Pipeline → Post-processing
    ↓
Screen
```

### State Management (Implemented)

- **Zustand** (`src/store/`): UI state, selection, panel visibility
- **React Query** (`src/hooks/`): GraphQL data fetching with caching
- **Animation System**: Internal animation state and transitions
- **Three.js Scene**: Render state managed by constellation classes

## 6.1.1 Reference Prototype (`reference_prototypes/family-constellations/`)

The original Vite prototype has been **superseded** by the production implementation. Key patterns were ported:

| Original Component | Production Location | Status |
|-------------------|---------------------|--------|
| ModernRenderer | `src/visualization/instanced-constellation.ts` | ✅ Ported + enhanced |
| FamilyGraph | `src/visualization/family-graph.ts` | ✅ Ported |
| ForceDirectedLayout | `src/visualization/force-directed-layout.ts` | ✅ Ported |
| Barnes-Hut | `src/visualization/barnes-hut.ts` | ✅ Ported |
| WebGL Shaders | TSL materials in `src/visualization/materials/` | ✅ Rewritten for WebGPU |
| Post-processing | `src/visualization/tsl-pipeline/` | ✅ Rewritten for WebGPU |

---

## 6.2 AI Implementation Status

### Current Status: NOT STARTED

The `src/ai/` directory exists but is empty. Firebase and Genkit dependencies are installed but no AI flows have been implemented.

**Installed Dependencies**:
- `firebase` ^12.7.0
- `firebase-admin` ^13.6.0

**Not Yet Installed** (needed for Genkit):
- `@genkit-ai/core`
- `@genkit-ai/googleai` or `@genkit-ai/vertexai`

## 6.2.1 Reference AI Codebase (`reference_prototypes/ancestral-synth/`)

### Stack
- **Python** (3.11+)
- **Pydantic AI** for LLM integration with structured outputs
- **SQLModel/SQLAlchemy** for async database ORM
- **Typer** for CLI
- **Loguru** for logging

### Architecture

```
ancestral_synth/
├── domain/
│   ├── models.py           # Pydantic domain models
│   └── enums.py            # Status, Gender, EventType, etc.
├── agents/
│   ├── biography_agent.py  # Generate biographies
│   ├── extraction_agent.py # Parse structured data
│   ├── correction_agent.py # Fix validation errors
│   ├── dedup_agent.py      # Duplicate detection
│   └── shared_event_agent.py # Cross-biography enrichment
├── services/
│   ├── genealogy_service.py # Pipeline orchestration
│   └── validation.py        # Genealogical rules
├── persistence/
│   ├── database.py         # Async DB connection
│   ├── tables.py           # SQLModel tables
│   └── repositories.py     # Data access
├── utils/
│   ├── cost_tracker.py     # LLM cost calculation
│   ├── rate_limiter.py     # API rate limiting
│   └── retry.py            # Exponential backoff
├── config.py               # Environment settings
└── cli.py                  # CLI commands
```

### Key Components

#### Agents

**BiographyAgent**
- Generates ~1000 word biographies
- Incorporates known relatives for consistency
- Uses historical context hints
- Input: BiographyContext → Output: Biography

**ExtractionAgent**
- Parses biographies into structured data
- Extracts: demographics, relationships, events, notes
- Handles approximate dates, name variations
- Input: Biography text → Output: ExtractedData

**CorrectionAgent**
- Fixes validation errors via LLM
- Agentic loop (max 2 attempts)
- Uses original biography as source of truth
- Input: Biography + ExtractedData + Errors → Output: CorrectedData

**DedupAgent**
- Sophisticated duplicate detection
- Handles: maiden/married names, middle names, suffixes
- Analyzes shared family members
- Input: PersonSummary + Candidates → Output: DedupResult

**SharedEventAgent**
- Cross-biography analysis
- Identifies shared experiences
- Discovers enrichment opportunities
- Input: Two biographies → Output: SharedEventAnalysis

#### Domain Models (Python → TypeScript Migration)

**Original Python models** (to be ported to TypeScript/Prisma):

```python
Person:
  id, status, given_name, surname, maiden_name, nickname  # status → speculative boolean
  gender, birth_date, birth_place, death_date, death_place
  biography, generation

Event:
  id, event_type, event_date, event_year, location  # event_type removed (freeform)
  description, primary_person_id, other_person_ids

Note:
  id, person_id, category, content, source  # category removed (freeform)
  referenced_person_ids
```

**Target TypeScript models** (aligned with 03_core_concepts.md):

```typescript
Person:
  id, speculative, givenName, surname, maidenName, nickname
  gender, birthDate, birthPlace, deathDate, deathPlace
  biography, generation

Event:
  id, title, date, location  // freeform - no predefined types
  description, primaryPersonId, participantIds

Note:
  id, personId, content, privacyLevel  // freeform annotations
  referencedPersonIds
```

#### Validation Rules
- Parents 14-60 years old at child's birth
- Maximum lifespan 120 years
- Death cannot precede birth
- Events within person's lifetime
- Age gap warnings for spouses

### LLM Provider Support
- OpenAI (GPT-4o, GPT-4o-mini, GPT-4 Turbo, o1, o3-mini)
- Anthropic (Claude 3.5 Sonnet/Haiku, Claude 3 Opus)
- Google (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash)
- Ollama (local models)

### Reuse Assessment

| Component | Reuse Potential | Modifications Needed |
|-----------|-----------------|---------------------|
| Agents | High | Port to TypeScript or run as service |
| Domain Models | High | Adapt for TypeScript/frontend |
| Validation | High | Port to TypeScript |
| Dedup Logic | High | Critical for matching feature |
| Cost Tracking | Medium | Adapt for Google billing |
| Persistence | Low | Replace with production DB |

### Integration Decisions

**Q6.2.1: Agent integration approach?**

**Decision**: Port all agents to TypeScript using Genkit

**Rationale**:
- Genkit is the decided AI framework (07_technology_decisions.md AI2)
- Single-language codebase (TypeScript) simplifies maintenance
- Genkit provides structured outputs with Zod schemas (replaces Pydantic AI)
- Native Vertex AI integration with observability built-in
- No Python service to deploy/maintain

**Migration path**:
1. BiographyAgent → Genkit flow with biography schema
2. ExtractionAgent → Genkit flow with extraction schema
3. CorrectionAgent → Genkit flow with validation retry loop
4. DedupAgent → Genkit flow with matching logic
5. SharedEventAgent → Genkit flow for cross-biography analysis

---

**Q6.2.2: Pydantic AI equivalent in TypeScript?**

**Decision**: Genkit with Zod schemas

**Rationale**:
- Genkit already decided as AI framework
- Zod provides runtime validation equivalent to Pydantic
- Genkit's structured output extracts data matching Zod schemas
- Same team maintains Zod integration in Genkit

---

**Q6.2.3: Domain model sharing strategy?**

**Decision**: TypeScript as single source (Prisma schema + Zod)

**Rationale**:
- All-TypeScript stack (no Python in production)
- Prisma schema generates TypeScript types for database entities
- Zod schemas for runtime validation and AI output parsing
- GraphQL schema generates client types via codegen
- Single source of truth eliminates sync issues

---

**Q6.2.4: Validation logic location?**

**Decision**: Shared (isomorphic)

**Rationale**:
- Zod schemas work identically in browser and Node.js
- Immediate validation feedback on client (better UX)
- Server-side validation in GraphQL resolvers (security)
- Same validation code, no duplication

---

## 6.3 Implementation Status

### What's Implemented

| Capability | Location | Status |
|------------|----------|--------|
| 3D Visualization | `src/visualization/` | ✅ Production |
| Force Layout | `src/visualization/` | ✅ Production |
| TSL Shaders (WebGPU) | `src/visualization/materials/` | ✅ Production |
| Animation System | `src/visualization/animation/` | ✅ Production |
| Object Pooling | `src/visualization/constellation-pool.ts` | ✅ Production |
| User Authentication | Firebase Auth + `src/components/providers/` | ✅ Production |
| Production Database | Cloud SQL + Prisma (`prisma/schema.prisma`) | ✅ Production |
| API Layer | GraphQL Yoga (`src/graphql/`) | ✅ Production |
| Rich Text Editor | Tiptap (`src/components/note-editor.tsx`) | ✅ Production |
| Media Upload | `src/components/media-uploader.tsx` | ✅ Production |
| Search | pg_trgm (`src/graphql/resolvers/search-resolvers.ts`) | ✅ Production |

### What's Not Yet Implemented

| Capability | Priority | Planned Solution | Status |
|------------|----------|------------------|--------|
| AI/Genkit Flows | High | Genkit + Vertex AI | ❌ Not started |
| Audio Transcription | High | Google Speech-to-Text V2 | ❌ Not started |
| Tree Matching | High | Matching algorithm | ❌ Schema only |
| Social Connections | Medium | Connection system | ❌ Schema only |
| Share Links | Medium | Public viewing | ❌ Schema only |
| 2D Tree View | Medium | d3-dag | ❌ Not started |
| Frame Mode | Low | Auto-rotation display | ❌ Not started |
| Payments | Medium | LemonSqueezy | ❌ Not started |
| Email | Low | Resend | ❌ Not started |

### Integration Decisions

**Q6.3.1: Monorepo vs separate repos?**

**Decision**: Single repo (Next.js all-in-one)

**Rationale**:
- Next.js API routes mean frontend + backend in single codebase
- No need for monorepo tooling (Turborepo, Nx)
- Simpler deployment (single Cloud Run service)
- Shared types are just regular imports
- Can extract services later if needed

---

**Q6.3.2: Shared type definitions?**

**Decision**: Generate from schemas (Prisma + GraphQL codegen)

**Rationale**:
- Prisma generates TypeScript types from database schema
- GraphQL Code Generator creates types from GraphQL schema
- No manual type maintenance
- Single source of truth for each layer:
  - Database: Prisma schema → `@prisma/client` types
  - API: GraphQL schema → generated client types
  - Validation: Zod schemas (manual, but used for AI outputs)

---

**Q6.3.3: API contract approach?**

**Decision**: GraphQL schema first

**Rationale**:
- GraphQL is the decided API architecture (07_technology_decisions.md B1)
- Schema serves as contract and documentation
- Type-safe clients via code generation
- Introspection enables tooling (GraphiQL, IDE support)

---

## 6.4 Architecture (Final)

> All technology decisions resolved per 07_technology_decisions.md

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Next.js     │  │ Zustand +   │  │ 3D Constellation    │ │
│  │ React App   │←→│ TanStack Q  │←→│ (WebGPU/Three.js)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  UI: Tailwind CSS + shadcn/ui        Rich Text: Tiptap     │
└────────────────────────────┬────────────────────────────────┘
                             │ GraphQL
┌────────────────────────────▼────────────────────────────────┐
│                     API Layer (Next.js)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Firebase    │  │ GraphQL     │  │ GraphQL             │ │
│  │ Auth        │  │ Yoga        │  │ Subscriptions       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Backend Services                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Prisma ORM  │  │ Genkit      │  │ Cloud Storage       │ │
│  │ (DB access) │  │ (AI Agents) │  │ (Media + CDN)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Data Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Cloud SQL   │  │ Cloud       │  │ PostgreSQL          │ │
│  │ PostgreSQL  │  │ Storage     │  │ Full-Text Search    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     External Services                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Vertex AI   │  │ LemonSqueezy│  │ Resend              │ │
│  │ (Gemini)    │  │ (Payments)  │  │ (Email)             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Deployment: Cloud Run

Single containerized Next.js application deployed to Cloud Run with:
- Auto-scaling (including scale-to-zero in dev/staging)
- `min-instances: 1` in production for cold start mitigation
- Cloud CDN for static assets and media delivery

---

## Next Steps

1. ~~Resolve integration approach questions (Q6.1.x, Q6.2.x, Q6.3.x)~~ ✅ Complete
2. ~~Define data model (08_data_model.md)~~ ✅ Complete + Implemented
3. ~~Define GraphQL API contracts (09_api_specification.md)~~ ✅ Complete + Implemented
4. ~~Create migration plan for existing codebases~~ ✅ 3D migrated, AI pending
5. **Next**: Implement AI flows with Genkit
6. **Next**: Implement billing with LemonSqueezy

---

*Status: Implementation Complete (except AI/Billing) - Updated 2026-01-18*
