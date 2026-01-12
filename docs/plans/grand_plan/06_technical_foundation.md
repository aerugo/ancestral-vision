# Ancestral Vision: Technical Foundation

> **Status**: COMPLETE - Analysis complete, all integration decisions resolved

This document analyzes the existing codebases and their applicability to Ancestral Vision.

---

## Existing Codebases

| Codebase | Location | Language | Purpose |
|----------|----------|----------|---------|
| 3D Constellation | `reference_prototypes/family-constellations/` | TypeScript | 3D visualization prototype |
| AI Genealogy | `reference_prototypes/ancestral-synth/` | Python | AI-powered genealogy generation |

---

## 6.1 3D Constellation Codebase (`reference_prototypes/family-constellations/`)

### Stack
- **TypeScript** (5.3.0) with strict mode
- **Three.js** (0.170.0) for WebGL rendering
- **Vite** (5.0.0) for build/dev server
- **Vitest** (1.1.0) for testing
- **postprocessing** (6.36.4) for effects
- **js-yaml** for YAML parsing

### Architecture

```
reference_prototypes/family-constellations/
├── src/
│   ├── main.ts                 # App orchestration, UI (~1246 lines)
│   ├── types/index.ts          # Core type definitions
│   ├── graph/graph.ts          # Family graph data structure (~294 lines)
│   ├── core/
│   │   ├── layout.ts           # Force-directed layout (~300 lines)
│   │   └── barnesHut.ts        # O(n log n) spatial partitioning
│   ├── renderer/
│   │   ├── ModernRenderer.ts   # 3D rendering + post-processing (~1180 lines)
│   │   └── AncestralWebRenderer.ts  # Legacy base renderer
│   ├── shaders/index.ts        # Custom WebGL shaders (~775 lines)
│   ├── parser/parser.ts        # YAML/JSON parsing (~334 lines)
│   └── utils/familyGenerator.ts # Test data generation
├── index.html
├── package.json
└── vite.config.ts
```

**Total**: ~6,534 lines of TypeScript

### Key Components

#### ModernRenderer
- Post-processing pipeline: SMAA, Bloom, Vignette
- Instanced rendering for 2000+ nodes
- Theme switching (dark cosmic / light manuscript)
- Sacred geometry background grid
- Particle systems for ambient effects

#### FamilyGraph
- Node/edge graph representation
- Generation calculation from centered person
- Relationship inference (siblings from shared parents)
- Biography weight calculation

#### ForceDirectedLayout
- 3D force-directed positioning
- Barnes-Hut optimization for O(n log n) performance
- Golden angle mandala ring initialization
- Generation-based layering

#### Shader System
- Node shaders: Bioluminescent orbs with sacred geometry
- Edge shaders: Flowing energy with Byzantine patterns
- Particle shaders: Hexagonal Haeckel shapes
- Firefly shaders: Event satellites with flickering

### Data Flow

```
YAML/JSON File
    ↓
Parser → FamilyData
    ↓
FamilyGraph → nodes, edges, generations
    ↓
ForceDirectedLayout → 3D positions
    ↓
ModernRenderer → WebGL scene
    ↓
Post-processing → Screen
```

### Reuse Assessment

| Component | Reuse Potential | Modifications Needed |
|-----------|-----------------|---------------------|
| ModernRenderer | High | API data loading, user centering |
| Shaders | High | Minor theme adjustments |
| FamilyGraph | High | API integration, real-time updates |
| Layout | High | Incremental layout for additions |
| Parser | Low | Replace with API client |
| Main App | Medium | Extract reusable logic, rebuild UI |

### Integration Decisions

**Q6.1.1: Integration approach for 3D code?**

**Decision**: Embed in Next.js app as internal modules

**Rationale**:
- 3D code is already TypeScript/Three.js - integrates naturally with Next.js
- Extract reusable components (ModernRenderer, FamilyGraph, Layout) as internal modules
- No need for npm package since it's internal to the project
- Can leverage react-three-fiber ecosystem for React integration

---

**Q6.1.2: State management integration?**

**Decision**: Hybrid - Sync with app state manager (Zustand + TanStack Query)

**Rationale**:
- Zustand (from same team as react-three-fiber) handles UI state (selected person, camera position, theme)
- TanStack Query handles server state (family data from GraphQL API)
- Three.js keeps internal rendering state (scene graph, animation state)
- Selection/focus changes in 3D sync to Zustand, which triggers UI updates

---

**Q6.1.3: Build system unification?**

**Decision**: Migrate to Next.js build

**Rationale**:
- Next.js is the chosen meta-framework (07_technology_decisions.md F2)
- Vite prototype build replaced by Next.js webpack/turbopack
- Unified build pipeline simplifies CI/CD
- Three.js code becomes regular modules in Next.js app

---

## 6.2 AI Genealogy Codebase (`reference_prototypes/ancestral-synth/`)

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

## 6.3 Gap Analysis

### What Exists

| Capability | Source | Status |
|------------|--------|--------|
| 3D Visualization | reference_prototypes/family-constellations/ | Production-quality |
| Force Layout | reference_prototypes/family-constellations/ | Production-quality |
| Custom Shaders | reference_prototypes/family-constellations/ | Production-quality |
| Biography Generation | reference_prototypes/ancestral-synth/ | Production-quality |
| Data Extraction | reference_prototypes/ancestral-synth/ | Production-quality |
| Deduplication | reference_prototypes/ancestral-synth/ | Production-quality |
| Validation | reference_prototypes/ancestral-synth/ | Production-quality |

### What's Missing → Decided Solutions

| Capability | Priority | Solution (per 07_technology_decisions.md) |
|------------|----------|-------------------------------------------|
| User Authentication | Critical | Firebase Auth |
| Production Database | Critical | Cloud SQL PostgreSQL + Prisma |
| API Layer | Critical | GraphQL Yoga (Next.js API routes) |
| Media Storage | High | Cloud Storage (GCS) + Cloud CDN |
| Audio Transcription | High | Google Speech-to-Text V2 (Chirp 3) |
| Tree Matching | High | Dedup logic ported to Genkit |
| Social Features | Medium | GraphQL + PostgreSQL relations |
| Real-time Sync | Medium | GraphQL Subscriptions |
| Mobile Optimization | Medium | iPad full support, iOS companion (05_features.md) |
| Frame Mode | Low | New feature to implement |
| Rich Text Editor | Medium | Tiptap |
| Payments | Medium | LemonSqueezy (MoR) |
| Email | Low | Resend |

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

1. ~~Resolve integration approach questions (Q6.1.x, Q6.2.x, Q6.3.x)~~ ✓ Complete
2. Define data model (08_data_model.md)
3. Define GraphQL API contracts (09_api_specification.md)
4. Create migration plan for existing codebases

---

*Status: Complete - All decisions resolved 2026-01-11*
