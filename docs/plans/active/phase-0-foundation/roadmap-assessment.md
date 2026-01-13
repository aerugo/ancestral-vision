# Roadmap Assessment - 2026-01-13

**Branch**: `claude/review-roadmap-planning-T5BJE`

---

## Executive Summary

**Overall Status**: **Phase 0 Complete** - Ready for Phase 1 MVP Development

The Ancestral Vision project has successfully completed all Phase 0 (Foundation) deliverables. The codebase has:

- **246 passing tests** across 28 test files
- **Complete tech stack** implemented (Next.js 15+, React 19, Three.js r171+, Prisma, GraphQL Yoga)
- **CI/CD pipeline** configured for Cloud Build deployment
- **Type-safe codebase** with full TypeScript strict mode

---

## Phase 0: Foundation - Complete ✅

### Completed Sub-Phases

| Phase | Name | Tests | Status |
|-------|------|-------|--------|
| 0.1 | Project Setup | Config tests | ✅ Complete |
| 0.2 | Database & Prisma | Schema + Seed | ✅ Complete |
| 0.3 | Firebase Auth | 21 tests | ✅ Complete |
| 0.4 | GraphQL API | 31 tests | ✅ Complete |
| 0.5 | State Management | 59 tests | ✅ Complete |
| 0.6 | UI Foundation | 28 tests | ✅ Complete |
| 0.7 | 3D Foundation | 50 tests | ✅ Complete |
| 0.8 | CI/CD & Deployment | 9 tests | ✅ Complete |

### Implementation Artifacts

**Infrastructure**:
- `Dockerfile` - Multi-stage production build
- `cloudbuild.yaml` - CI/CD pipeline with lint/typecheck/test gates
- `docker-compose.yml` - Local PostgreSQL development
- `.env.local.example`, `.env.production.example` - Environment templates

**Database Layer**:
- `prisma/schema.prisma` - 16 entity models (User, Constellation, Person, Event, Note, Media, etc.)
- `prisma/seed.ts` - Test data seeding
- `src/lib/prisma.ts` - Singleton Prisma client

**Authentication**:
- `src/lib/firebase.ts` - Firebase Client SDK
- `src/lib/firebase-admin.ts` - Firebase Admin SDK
- `src/lib/auth.ts` - Token verification, user creation
- `src/components/providers/auth-provider.tsx` - React auth context

**API**:
- `src/graphql/schema.ts` - GraphQL type definitions
- `src/graphql/resolvers/index.ts` - Query/Mutation resolvers
- `src/app/api/graphql/route.ts` - GraphQL Yoga endpoint

**State Management**:
- `src/store/auth-store.ts` - Zustand auth state with persistence
- `src/store/ui-store.ts` - Zustand UI state (theme, view mode, selection)
- `src/lib/graphql-client.ts` - GraphQL Request client with auth headers
- `src/hooks/` - TanStack Query hooks (useMe, useConstellation, usePeople)

**3D Visualization**:
- `src/visualization/renderer.ts` - WebGPU/WebGL renderer with fallback
- `src/visualization/scene.ts` - Scene, camera, OrbitControls setup
- `src/visualization/constellation.ts` - Star mesh generation
- `src/components/constellation-canvas.tsx` - React canvas component

**UI Components**:
- `src/components/ui/` - shadcn/ui components (Button, Card, Input, etc.)
- `src/app/page.tsx` - Landing page
- `src/app/(auth)/` - Login/Register pages with form validation
- `src/components/app-shell.tsx` - Navigation and layout shell

### Remaining Phase 0 Task

One documentation task remains from the Phase 0 plan:

- [ ] **Create `docs/invariants/INVARIANTS.md`** - Document architectural invariants discovered during implementation

This is non-blocking for Phase 1 development.

---

## Phase 1: MVP (Closed Beta) - Next Steps

### Overview

Phase 1 delivers the complete single-player MVP experience for closed beta launch. Users should be able to create a meaningful family constellation with stories, not just data.

### Recommended Implementation Order

Based on technical dependencies and user value:

#### Sprint 1: Person Management Foundation

1. **Person CRUD Operations** (US-2.1, US-2.2, US-2.4)
   - Create person (contextual + global)
   - Edit person details with auto-save
   - Delete person (soft delete, 30-day recovery)
   - International name support (patronymic, Eastern names)

2. **Relationship Management** (US-2.5)
   - Parent-child relationships
   - Spouse relationships
   - Adoptive relationship types

#### Sprint 2: 3D Constellation Enhancement

3. **Constellation Navigation** (US-4.1, US-4.2)
   - Click to select person
   - Camera animation to selected person
   - Connected people highlighting on selection

4. **Visual Enhancements** (US-4.3, US-4.4)
   - Biography weight → star brightness
   - Generation-based mandala layout

#### Sprint 3: Content Management

5. **Notes System** (US-3.1)
   - Tiptap rich text editor
   - 50,000 character limit
   - Version history (last 10)
   - Privacy levels per note

6. **Events System** (US-3.4, US-3.5)
   - Freeform events with flexible dates
   - Shared events with multiple participants

7. **Media Upload** (US-3.6)
   - Photo upload with thumbnails
   - Document upload (PDF)
   - Privacy levels per media

#### Sprint 4: Profile & Search

8. **Person Profile Panel**
   - Slide-in panel with person details
   - Tabbed interface: Events, Notes, Photos
   - Immediate family members display
   - Edit mode with inline editing

9. **Search** (US-6.1)
   - Global search bar
   - Fuzzy name search (pg_trgm)
   - Search results with navigation

#### Sprint 5: Onboarding

10. **First-Run Wizard** (US-1.3, US-1.4, US-1.5, US-1.6)
    - Add yourself step
    - Add parents step
    - Add grandparents (optional)
    - "Aha moment" constellation reveal

11. **Beta Infrastructure**
    - Waitlist landing page
    - Beta invite system

#### Sprint 6: Subscription & Export

12. **Subscription & Billing** (US-10.x)
    - Pricing page: Free vs Premium
    - LemonSqueezy Checkout integration
    - Customer Portal link
    - Webhook handlers
    - Usage tracking (people count, storage)
    - Quota warnings at 80%

13. **Data Export**
    - GEDCOM export
    - JSON export

### Phase 1 Success Criteria

From `12_roadmap.md`:

- [ ] Onboarding completion rate >70%
- [ ] Users create average 10+ people in first session
- [ ] <3s initial load time for 100-person constellation
- [ ] <5% error rate on media uploads

### Technical Priorities

1. **TDD Workflow** - All features implemented with tests first
2. **Type Safety** - No `any` types, complete annotations
3. **Invariants** - Document all architectural constraints
4. **Performance** - Monitor 3D performance during implementation

---

## Phases 2-4 Overview

### Phase 2: AI Enhancement
- Biography generation from notes/events
- Content extraction from documents
- Audio transcription with speaker diarization
- AI suggestion review workflow

### Phase 3: Social & Matching
- User connections with permission levels
- Bilateral tree matching
- Share links for read-only views
- Notifications

### Phase 4: Polish & Advanced
- 2D tree view alternative
- Digital frame mode (Chromecast)
- Speculative ancestry generation
- Performance optimization (1000+ nodes at 60fps)
- WCAG 2.1 AA accessibility

---

## Recommendations

### Immediate Next Steps

1. **Create Phase 1 Planning Documents**
   - `docs/plans/active/phase-1-mvp/spec.md`
   - `docs/plans/active/phase-1-mvp/development-plan.md`
   - `docs/plans/active/phase-1-mvp/work-notes.md`

2. **Start with Person CRUD**
   - This unlocks all other features
   - Write tests first following TDD
   - Focus on GraphQL mutations and queries

3. **Create INVARIANTS.md**
   - Document discovered patterns
   - Essential for maintaining consistency

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 3D performance with data | Profile early with realistic datasets |
| Tiptap editor complexity | Start simple, add features incrementally |
| LemonSqueezy integration | Set up sandbox early, test thoroughly |
| Onboarding UX | Prototype wizard flow before full implementation |

---

## Conclusion

The project is **exceptionally well-positioned** for Phase 1 development:

- **Strong foundation** with 246 tests providing confidence
- **Clear roadmap** with all decisions documented
- **Mature architecture** following established patterns
- **TDD workflow** ensuring quality throughout

The recommended approach is to begin Phase 1 with Person CRUD operations, as this is the foundation that all other MVP features depend upon.

---

*Generated: 2026-01-13*
*Last Updated: 2026-01-13*
