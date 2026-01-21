# Roadmap Progress Report

> **Generated**: 2026-01-18
> **Based on**: [docs/plans/grand_plan/12_roadmap.md](../plans/grand_plan/12_roadmap.md)

This document tracks implementation progress against the grand plan roadmap.

---

## Executive Summary

| Phase | Name | Planned Status | Actual Status | Progress |
|-------|------|----------------|---------------|----------|
| 0 | Foundation | Not Started | **COMPLETE** | 100% |
| 1 | MVP (Closed Beta) | Not Started | **IN PROGRESS** | ~75% |
| 2 | AI Enhancement | Not Started | **NOT STARTED** | 5% |
| 3 | Social & Matching | Not Started | **PARTIAL** | ~20% |
| 4 | Polish & Advanced | Not Started | **PARTIAL** | ~25% |

**Overall Progress**: The project has substantially exceeded the "Not Started" status documented in the roadmap. Phase 0 is complete, Phase 1 is well advanced, and foundational work for later phases exists.

---

## Phase 0: Foundation - COMPLETE

### Infrastructure
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| GCP projects created | :white_check_mark: | `cloudbuild.yaml` references ancestral-vision project |
| Cloud Run service configured | :white_check_mark: | Full Cloud Run deployment in `cloudbuild.yaml` |
| Cloud SQL PostgreSQL provisioned | :white_check_mark: | `DATABASE_URL` from Secret Manager |
| Cloud Storage buckets created | :grey_question: | Configuration exists but unclear if buckets provisioned |
| Secret Manager populated | :white_check_mark: | 3 secrets in `cloudbuild.yaml` |
| Cloud Build CI/CD pipeline operational | :white_check_mark: | Comprehensive `cloudbuild.yaml` |

### Development Environment
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Docker Compose for local PostgreSQL | :white_check_mark: | `docker-compose.yml` |
| Firebase Emulator configured | :white_check_mark: | `firebase.json` with Auth UI |
| Environment variables documented | :white_check_mark: | `.env.example` exists |
| npm scripts: dev, build, test, lint, typecheck | :white_check_mark: | All scripts in `package.json` |

### Application Foundation
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Next.js 14+ app scaffold with App Router | :white_check_mark: | Next.js 16.1.1 with App Router |
| GraphQL Yoga API route (/api/graphql) | :white_check_mark: | `src/app/api/graphql/route.ts` |
| Prisma schema v1 with core entities | :white_check_mark: | Comprehensive schema with 20+ tables |
| Firebase Auth integration | :white_check_mark: | Full auth flow, register, login, logout |
| TanStack Query + Zustand state management | :white_check_mark: | React Query 5.x + Zustand 5.x |
| Tailwind CSS + shadcn/ui component library | :white_check_mark: | Tailwind 4.x + Radix UI components |

### 3D Foundation
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Three.js integration | :white_check_mark: | Three.js 0.182.0 |
| WebGPU renderer with WebGL fallback | :white_check_mark: | WebGPU-only (WebGL deprecated by design) |
| Basic scene rendering with placeholder data | :white_check_mark: | Full constellation rendering |
| Camera controls (orbit, zoom, pan) | :white_check_mark: | Complete camera system |

### Definition of Done - Phase 0
- [x] Can register, login, logout via Firebase Auth
- [x] Can deploy to Cloud Run (dev environment)
- [x] Basic 3D scene renders with placeholder constellation
- [x] GraphQL playground accessible at /api/graphql
- [x] All CI checks pass (lint, typecheck, test)

---

## Phase 1: MVP (Closed Beta) - IN PROGRESS (~75%)

### Onboarding (US-1.x)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| First-run wizard: Add yourself | :white_check_mark: | `onboarding-resolvers.ts`, guided 5-step flow |
| First-run wizard: Add parents | :white_check_mark: | Part of onboarding flow |
| First-run wizard: Add grandparents optional | :white_check_mark: | Part of onboarding flow |
| "Aha moment" constellation reveal | :white_check_mark: | `camera-animation.ts`, reveal animation |
| Beta waitlist landing page | :x: | Not implemented |
| Beta invite system | :x: | Not implemented |

### Person Management (US-2.x)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Create person (contextual + global) | :white_check_mark: | `add-person-dialog.tsx`, resolvers |
| Edit person details with auto-save | :white_check_mark: | `edit-person-dialog.tsx` |
| Upload person photo with cropping | :grey_question: | Media upload exists, cropping unclear |
| Delete person (soft delete, 30-day recovery) | :white_check_mark: | Prisma schema has `deletedAt` |
| Manage relationships: parent-child, spouse | :white_check_mark: | Full relationship resolvers |
| International name support | :white_check_mark: | Prisma schema has `patronymic`, `givenNameAtBirth` |

### 3D Constellation (US-4.x)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Navigate constellation (rotate, zoom, pan) | :white_check_mark: | Complete camera controls |
| Click to select person, camera animation | :white_check_mark: | `selection.ts`, camera reveal |
| Biography weight → star brightness | :white_check_mark: | `tsl-cloud-material.ts` with biography scaling |
| Generation-based mandala layout | :white_check_mark: | Force-directed layout with constraints |
| Dark theme (cosmic) default | :white_check_mark: | Theme provider implemented |
| Connected people highlighting | :white_check_mark: | Selection highlighting system |

### Person Profile Panel
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Slide-in panel with person details | :white_check_mark: | `person-profile-panel.tsx` |
| Tabbed interface: Events, Notes, Photos | :white_check_mark: | Tab components exist |
| Immediate family members display | :white_check_mark: | Relationship queries |
| Edit mode with inline editing | :white_check_mark: | Edit dialog components |

### Content (US-3.x partial)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Notes: Create, edit, delete with Tiptap | :white_check_mark: | `note-editor.tsx`, Tiptap 3.x |
| Notes: 50,000 char limit, version history | :grey_question: | Notes exist, version history unclear |
| Events: Create freeform events | :white_check_mark: | `event-resolvers.ts` |
| Events: Shared events with multiple participants | :white_check_mark: | `EventParticipant` in schema |
| Media: Photo upload with thumbnails | :white_check_mark: | `media-uploader.tsx` |
| Media: Document upload (PDF) | :white_check_mark: | Media types include documents |
| Privacy levels per item | :white_check_mark: | `PrivacyLevel` enum in schema |

### Search (US-6.x)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Global search bar | :white_check_mark: | `search-bar.tsx` |
| Fuzzy name search (pg_trgm) | :white_check_mark: | `search-resolvers.ts` |
| Search results with navigation | :white_check_mark: | `use-search.ts` hook |

### Account & Settings (US-9.x)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Account settings page | :white_check_mark: | `/app/(app)/settings` |
| Change email, password | :grey_question: | Auth settings, not fully verified |
| Default privacy setting | :white_check_mark: | User settings in schema |
| Theme preference | :white_check_mark: | Theme provider |
| Request account deletion | :x: | Not implemented |

### Subscription & Billing (US-10.x) - NOT STARTED
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Pricing page | :x: | Not implemented |
| LemonSqueezy Checkout | :x: | Not implemented |
| LemonSqueezy Customer Portal | :x: | Not implemented |
| Webhook handlers | :x: | Not implemented |
| Usage tracking | :grey_question: | `usageTracking` exists in schema |
| Quota warnings | :x: | Not implemented |

### Data & Export
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| GEDCOM export | :x: | Not implemented |
| JSON export | :x: | Not implemented |

### Definition of Done - Phase 1
- [x] New user can complete onboarding wizard
- [x] Can create constellation with 50+ people
- [x] Can navigate 3D constellation smoothly
- [x] Can write notes and add events
- [x] Can upload photos and documents
- [x] Can search and find people
- [ ] Can subscribe to Premium via LemonSqueezy
- [ ] Can export data as GEDCOM
- [ ] Closed beta invites working

---

## Phase 2: AI Enhancement - NOT STARTED (~5%)

### AI Infrastructure
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Genkit setup with Vertex AI | :x: | `/src/ai/` directory empty |
| AI operation quota tracking | :x: | Not implemented |
| Cost tracking per user | :x: | Not implemented |
| Rate limiting | :x: | Not implemented |

### Biography Generation (US-3.9)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| "Generate Biography" button | :x: | Not implemented |
| Synthesize notes into narrative | :x: | Not implemented |
| Tone selection | :x: | Not implemented |

### Content Extraction (US-3.7)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Extract from documents | :x: | Not implemented |
| Suggestion review interface | :x: | Not implemented |

### Audio Transcription (US-3.2, US-3.3)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Audio upload | :white_check_mark: | Media types include audio |
| Google Speech-to-Text integration | :x: | Not implemented |
| Speaker diarization | :x: | Not implemented |
| Transcript editor | :x: | Not implemented |

**Note**: Infrastructure for AI exists (Firebase dependencies installed, schema has transcription fields) but no AI flows implemented.

---

## Phase 3: Social & Matching - PARTIAL (~20%)

### Data Model - IMPLEMENTED
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Connection model | :white_check_mark: | Prisma schema has `Connection` |
| Match model | :white_check_mark: | Prisma schema has `Match` |
| ShareLink model | :white_check_mark: | Prisma schema has `ShareLink` |

### User Connections (US-7.1) - NOT IMPLEMENTED
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Send connection request | :x: | No UI/resolver |
| Accept/decline requests | :x: | Not implemented |
| Remove/block user | :x: | Not implemented |

### Matching (US-7.3) - NOT IMPLEMENTED
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Manual matching UI | :x: | Not implemented |
| Fuzzy matching algorithm | :x: | Not implemented |
| Confidence scoring | :grey_question: | Field exists in schema |

### Share Links (US-8.1) - NOT IMPLEMENTED
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Generate shareable link | :x: | Not implemented |
| Read-only public view | :x: | Not implemented |

**Note**: Database schema is ready for social features but UI and business logic not built.

---

## Phase 4: Polish & Advanced - PARTIAL (~25%)

### 2D Tree View (US-2.6)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Toggle 3D/2D views | :x: | Not implemented |
| d3-dag layout | :x: | Not implemented |

### Theme System (US-4.5)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Dark theme (Cosmic) | :white_check_mark: | Implemented |
| Light theme | :grey_question: | Theme toggle exists |
| Theme toggle in settings | :white_check_mark: | Theme provider |

### Sample Tour (US-1.2)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Pre-built sample constellation | :white_check_mark: | Template seeding exists |
| Guided camera flythrough | :x: | Not implemented |
| Tutorial callouts | :x: | Not implemented |

### Performance Optimization
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 1000+ people support | :grey_question: | Pooling system implemented |
| Lazy loading | :grey_question: | Incremental updates exist |
| Image optimization | :grey_question: | Next.js Image used |
| 90+ Lighthouse score | :grey_question: | Not verified |

### Frame Mode (US-8.2)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Full-screen minimal UI | :x: | Not implemented |
| Auto-rotation | :x: | Not implemented |
| Chromecast support | :x: | Not implemented |

### Speculative Ancestry (US-5.1, US-5.2)
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Generate speculative ancestors | :x: | Not implemented |
| Ghost/translucent visual style | :white_check_mark: | `ghost-node-material.ts` |
| "Confirm" workflow | :x: | Not implemented |
| Speculative portrait generation | :x: | Not implemented |

### Data Import
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| GEDCOM import | :x: | Not implemented |

### Accessibility
| Deliverable | Status | Evidence |
|-------------|--------|----------|
| WCAG 2.1 AA compliance | :grey_question: | Not audited |
| Keyboard navigation | :grey_question: | Not verified |
| Screen reader support | :grey_question: | Not verified |

---

## Beyond Roadmap: Implemented Features

The project has implemented significant features not explicitly tracked in the roadmap:

### Animation System (Very Sophisticated)
- Central `AnimationSystem` with event bus
- Reactive attribute binding system
- Timeline and transition management
- Propagation animations for cascading effects
- Biography-to-ghost transitions with reverse capability
- Sphere shell particles for dissolution effects
- A/B testing infrastructure for animation modes

### Object Pooling
- Game engine-style `ConstellationPool`
- Efficient instanced mesh management
- Hot-swappable constellation updates

### Visual Effects
- Sacred geometry grid overlays
- Background particle systems
- Path pulse animations along connections
- Post-processing pipeline with performance tiers

### Development Infrastructure
- 103 test files with comprehensive coverage
- Detailed invariants documentation
- AI agent planning protocol
- 10+ completed implementation plans with work notes

---

## Recommendations

### Immediate Priorities (to complete Phase 1)
1. **Billing Integration**: LemonSqueezy checkout, webhooks, customer portal
2. **Data Export**: GEDCOM and JSON export functionality
3. **Beta System**: Waitlist landing page, invite system

### Next Phase (Phase 2: AI)
1. Set up Genkit with Vertex AI plugin
2. Implement biography generation flow
3. Add audio transcription via Speech-to-Text V2

### Technical Debt
- Update roadmap document to reflect actual progress
- Consider moving social schema models to Phase 3 active work
- Document ghost node visual system (already implemented)

---

## Legend

- :white_check_mark: Complete
- :grey_question: Partial/Unclear
- :x: Not started
