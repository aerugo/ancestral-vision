# Ancestral Vision: Development Roadmap

> **Status**: COMPLETE - All phases defined, decisions resolved

This document outlines the development roadmap for Ancestral Vision.

---

## Roadmap Philosophy

- **Vertical slices**: Each phase delivers usable functionality
- **Core first**: Build foundation before advanced features
- **Feedback loops**: Launch early (closed beta), iterate based on feedback
- **No time estimates**: Scope defined, timing determined by capacity
- **AI-augmented development**: Solo developer with AI agent orchestration for parallelization

---

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| 0 | Foundation | Architecture, infrastructure, auth | Not Started |
| 1 | MVP (Closed Beta) | Core experience + content + billing | Not Started |
| 2 | AI Enhancement | Discovery, biography, transcription | Not Started |
| 3 | Social & Matching | Connections, tree matching | Not Started |
| 4 | Polish & Advanced | Performance, frame mode, speculation | Not Started |

---

## Phase 0: Foundation

### Goals
- Establish technical architecture per [07_technology_decisions.md](07_technology_decisions.md)
- Set up GCP infrastructure per [11_deployment_operations.md](11_deployment_operations.md)
- Implement Firebase Auth
- Create development workflow with CI/CD

### Deliverables

```markdown
# Infrastructure
- [ ] GCP projects created (ancestral-vision-dev, ancestral-vision-prod)
- [ ] Cloud Run service configured
- [ ] Cloud SQL PostgreSQL provisioned
- [ ] Cloud Storage buckets created
- [ ] Secret Manager populated
- [ ] Cloud Build CI/CD pipeline operational

# Development Environment
- [ ] Docker Compose for local PostgreSQL
- [ ] Firebase Emulator configured
- [ ] Environment variables documented (.env.local, .env.production)
- [ ] npm scripts: dev, build, test, lint, typecheck

# Application Foundation
- [ ] Next.js 14+ app scaffold with App Router
- [ ] GraphQL Yoga API route (/api/graphql)
- [ ] Prisma schema v1 with core entities (User, Constellation, Person)
- [ ] Firebase Auth integration (register, login, logout, password reset)
- [ ] TanStack Query + Zustand state management setup
- [ ] Tailwind CSS + shadcn/ui component library configured

# 3D Foundation
- [ ] Three.js integration from reference_prototypes/family-constellations/
- [ ] WebGPU renderer with WebGL fallback
- [ ] Basic scene rendering with placeholder data
- [ ] Camera controls (orbit, zoom, pan)
```

### User Stories Addressed
- US-1.1: Account Creation (partial - auth infrastructure)
- US-1.7: Password Reset

### Definition of Done
- Can register, login, logout via Firebase Auth
- Can deploy to Cloud Run (dev environment)
- Basic 3D scene renders with placeholder constellation
- GraphQL playground accessible at /api/graphql
- All CI checks pass (lint, typecheck, test)

### Technical References
- Auth: [07_technology_decisions.md](07_technology_decisions.md) A1-A2
- Database: [07_technology_decisions.md](07_technology_decisions.md) B3-B5
- Infrastructure: [11_deployment_operations.md](11_deployment_operations.md)

---

## Phase 1: MVP (Closed Beta)

### Goals
- Complete single-player experience for closed beta launch
- Users can create constellation, add people, write content
- Subscription/billing operational
- "Richer MVP" scope: Core + Content + Billing

### Deliverables

```markdown
# Onboarding (US-1.x)
- [ ] First-run wizard: Add yourself (US-1.3)
- [ ] First-run wizard: Add parents (US-1.4)
- [ ] First-run wizard: Add grandparents optional (US-1.5)
- [ ] "Aha moment" constellation reveal (US-1.6)
- [ ] Beta waitlist landing page
- [ ] Beta invite system

# Person Management (US-2.x)
- [ ] Create person (contextual + global) (US-2.1)
- [ ] Edit person details with auto-save (US-2.2)
- [ ] Upload person photo with cropping (US-2.3)
- [ ] Delete person (soft delete, 30-day recovery) (US-2.4)
- [ ] Manage relationships: parent-child, spouse, adoptive (US-2.5)
- [ ] International name support (patronymic, Eastern names)

# 3D Constellation (US-4.x)
- [ ] Navigate constellation (rotate, zoom, pan) (US-4.1)
- [ ] Click to select person, camera animation (US-4.2)
- [ ] Biography weight → star brightness (US-4.3)
- [ ] Generation-based mandala layout (US-4.4)
- [ ] Dark theme (cosmic) default
- [ ] Connected people highlighting on selection

# Person Profile Panel
- [ ] Slide-in panel with person details
- [ ] Tabbed interface: Events, Notes, Photos
- [ ] Immediate family members display
- [ ] Edit mode with inline editing

# Content (US-3.x partial)
- [ ] Notes: Create, edit, delete with Tiptap rich text (US-3.1)
- [ ] Notes: 50,000 char limit, version history (last 10)
- [ ] Events: Create freeform events with flexible dates (US-3.4)
- [ ] Events: Shared events with multiple participants (US-3.5)
- [ ] Media: Photo upload with thumbnails (US-3.6 partial)
- [ ] Media: Document upload (PDF)
- [ ] Privacy levels per item (private, connections, public) (US-3.8)

# Search (US-6.x)
- [ ] Global search bar (US-6.1)
- [ ] Fuzzy name search (pg_trgm)
- [ ] Search results with navigation to person

# Account & Settings (US-9.x)
- [ ] Account settings page (US-9.1)
- [ ] Change email, password
- [ ] Default privacy setting (US-9.2)
- [ ] Theme preference (dark/light/system)
- [ ] Request account deletion (14-day grace)

# Subscription & Billing (US-10.x)
- [ ] Pricing page: Free vs Premium comparison (US-10.1)
- [ ] LemonSqueezy Checkout integration (US-10.2)
- [ ] LemonSqueezy Customer Portal link (US-10.3)
- [ ] Webhook handlers for subscription events (US-10.4)
- [ ] Usage tracking: people count, storage used (US-10.5)
- [ ] Quota warnings at 80% threshold
- [ ] Graceful limit handling (prompt upgrade, don't lose work)

# Data & Export
- [ ] GEDCOM export
- [ ] JSON export
```

### User Stories Addressed
- **Must Have**: US-1.1, US-1.3-1.6, US-1.7, US-2.1, US-2.2, US-2.5, US-4.1, US-4.2, US-4.4, US-6.1, US-9.1
- **Should Have (partial)**: US-2.3, US-2.4, US-3.1, US-3.4, US-3.5, US-3.6, US-3.8, US-4.3, US-9.2, US-10.1-10.5

### Definition of Done
- New user can complete onboarding wizard
- Can create constellation with 50+ people (free tier limit)
- Can navigate 3D constellation smoothly (60fps desktop)
- Can write notes and add events to people
- Can upload photos and documents
- Can search and find people
- Can subscribe to Premium via LemonSqueezy
- Can export data as GEDCOM
- Closed beta invites working

### Success Metrics
- Onboarding completion rate >70%
- Users create average 10+ people in first session
- <3s initial load time for 100-person constellation
- <5% error rate on media uploads

### Technical References
- Data Model: [08_data_model.md](08_data_model.md)
- API: [09_api_specification.md](09_api_specification.md)
- Features: [05_features.md](05_features.md) sections 4.1-4.5, 4.12, 4.14-4.17

---

## Phase 2: AI Enhancement

### Goals
- AI-powered content extraction and generation
- Audio transcription for oral histories
- Smart suggestions with user approval workflow

### Deliverables

```markdown
# AI Infrastructure
- [ ] Genkit setup with Vertex AI plugin
- [ ] AI operation quota tracking (15 free, 100 premium)
- [ ] Cost tracking per user
- [ ] Rate limiting (per 05_features.md Q4.7.5)

# Biography Generation (US-3.9)
- [ ] "Generate Biography" button on person profile
- [ ] Synthesize notes + events into narrative
- [ ] Tone selection: formal, storytelling, factual
- [ ] Edit and save generated biography

# Content Extraction (US-3.7)
- [ ] Extract data from uploaded documents
- [ ] Extract data from notes (manual trigger)
- [ ] Extract: names, dates, locations, events, relationships
- [ ] Suggestion review interface
- [ ] Accept/reject/edit individual suggestions
- [ ] Link extracted people to existing tree entries

# Audio Transcription (US-3.2, US-3.3)
- [ ] Audio upload (MP3, M4A, WAV, WebM, max 2 hours)
- [ ] Google Speech-to-Text V2 (Chirp 3) integration
- [ ] Speaker diarization (up to 6 speakers)
- [ ] Transcription status: pending, processing, complete, failed
- [ ] Time-synced transcript editor
- [ ] Click transcript to jump to audio position
- [ ] Edit transcript inline, label speakers
- [ ] Extract suggestions from transcripts

# Suggestion Engine
- [ ] Pending suggestions list in UI
- [ ] Group by type: people, events, corrections
- [ ] Confidence scores (high >90%, medium 70-90%, low <70%)
- [ ] "Suggested because..." reasoning with source excerpt
- [ ] Batch approval interface
```

### User Stories Addressed
- US-3.2: Upload Audio Memory
- US-3.3: AI Audio Transcription
- US-3.7: AI Content Extraction
- US-3.9: Generate Biography from Notes

### Definition of Done
- Can generate biography for any person with notes
- Can upload audio and receive transcription with speaker labels
- Can extract people/events from documents with review workflow
- Can accept/reject AI suggestions
- AI quota tracked and enforced per tier

### Success Metrics
- AI suggestion acceptance rate >30%
- Biography generation satisfaction >70% (user feedback)
- Transcription accuracy >90% (spot check)
- <30s average transcription queue time

### Technical References
- AI Framework: [07_technology_decisions.md](07_technology_decisions.md) AI1-AI4
- AI Features: [05_features.md](05_features.md) sections 4.6-4.7
- Existing Agents: [06_technical_foundation.md](06_technical_foundation.md) section 6.2

---

## Phase 3: Social & Matching

### Goals
- Connect with other users
- Match trees to find shared ancestors
- Share content with connections

### Deliverables

```markdown
# User Connections (US-7.1)
- [ ] Send connection request (by email or username)
- [ ] Accept/decline connection requests
- [ ] Connection permission levels: Family, Researcher
- [ ] Remove connection
- [ ] Block user

# View Connection's Tree (US-7.2)
- [ ] Browse people in connection's tree
- [ ] Search/filter their tree
- [ ] Respect privacy settings (only visible content shown)

# Manual Matching (US-7.3)
- [ ] "Match" button on connection's person
- [ ] Side-by-side comparison for confirmation
- [ ] Bilateral acceptance (both users must accept)
- [ ] Transitive access to connected people
- [ ] Unmatch with 30-day cooldown

# Matched Content (US-7.4, US-7.5, US-7.6)
- [ ] See matched people in your constellation
- [ ] Visual distinction for "not your own content yet"
- [ ] View shared notes and events from connection
- [ ] "Add to my tree" action (adopt by adding content)
- [ ] Content attribution (who contributed what)

# Match Suggestions
- [ ] Fuzzy matching algorithm (name, dates, location, parents)
- [ ] Confidence scoring (0-100, threshold 60+)
- [ ] Suggested matches list
- [ ] AI-assisted matching for Premium users

# Notifications
- [ ] In-app notification badge
- [ ] Email notifications (configurable)
- [ ] Types: connection request, match suggestion, shared content update

# Share Links (US-8.1)
- [ ] Generate shareable constellation link
- [ ] Read-only view (no account required)
- [ ] Public content only
- [ ] Link expiration settings
- [ ] Revoke link
- [ ] View count tracking
- [ ] Limits: Free 1 active, Premium unlimited
```

### User Stories Addressed
- US-7.1: Connect with Another User
- US-7.2: View Connection's Tree
- US-7.3: Match a Person Manually
- US-7.4: View Connected People in Constellation
- US-7.5: Adopt a Connected Person
- US-7.6: Shared Content Sync
- US-8.1: Share Constellation Link

### Definition of Done
- Can send/accept connection requests
- Can browse connection's tree and propose matches
- Matched people appear in constellation with visual distinction
- Can see shared notes from connections on matched people
- Share links work for unauthenticated viewers
- Notifications delivered for social actions

### Success Metrics
- Match acceptance rate >50%
- Connection-driven return visits (users return after connection activity)
- Share link usage (views per link)

### Technical References
- Matching: [05_features.md](05_features.md) sections 4.9-4.10
- Data Model: [08_data_model.md](08_data_model.md) Match, Connection entities
- API: [09_api_specification.md](09_api_specification.md) match/connection mutations

---

## Phase 4: Polish & Advanced

### Goals
- Production-ready performance and polish
- 2D tree view alternative
- Digital frame mode
- Speculative ancestry features

### Deliverables

```markdown
# 2D Tree View (US-2.6)
- [ ] Toggle between 3D Constellation and 2D Tree
- [ ] d3-dag pedigree layout
- [ ] SVG rendering with virtual scrolling
- [ ] Shared selection between views
- [ ] Same profile panel in both views
- [ ] User preference persistence

# Theme System (US-4.5)
- [ ] Dark theme: Cosmic (stars on dark space)
- [ ] Light theme: Illuminated manuscript style
- [ ] Theme toggle in settings
- [ ] Modular theme configuration

# Sample Tour (US-1.2)
- [ ] Pre-built sample constellation (4 generations, ~15 people)
- [ ] Guided camera flythrough (60-90 seconds)
- [ ] Tutorial callouts explaining features
- [ ] "Skip" available at any time
- [ ] Re-access from Help menu

# Performance Optimization
- [ ] Constellation handles 1000+ people smoothly
- [ ] Lazy loading for large trees
- [ ] Image optimization (WebP, lazy load thumbnails)
- [ ] Code splitting and bundle optimization
- [ ] 90+ Lighthouse performance score

# iPad Support
- [ ] Touch controls for 3D (pinch-zoom, pan, rotate, tap-select)
- [ ] Responsive profile panel (expands on iPad)
- [ ] Testing on Safari iPad

# Search Improvements (US-6.2)
- [ ] Browse by surname
- [ ] Surname list with counts
- [ ] Filter constellation by surname

# Digital Frame Mode (US-8.2)
- [ ] Full-screen minimal UI mode
- [ ] Slow auto-rotation of constellation
- [ ] Periodic person highlights (every 30s)
- [ ] Display name and key dates
- [ ] Chromecast support (browser tab casting)
- [ ] 30fps, simplified shaders for cast devices

# Speculative Ancestry (US-5.1, US-5.2) - Premium Only
- [ ] Opt-in with clear explanation
- [ ] Generate speculative ancestors (up to 5 generations)
- [ ] Historical context: name popularity, occupations by era
- [ ] Speculative people: ghost/translucent visual style
- [ ] Clear "speculative" labels everywhere
- [ ] "Confirm" workflow (requires source evidence)
- [ ] Speculative portrait generation via Imagen
- [ ] "AI-generated" watermark on portraits
- [ ] Exclude speculative from exports by default

# Data Import
- [ ] GEDCOM import
- [ ] Duplicate detection during import
- [ ] Review and merge workflow

# Accessibility
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Keyboard navigation for tree
- [ ] Screen reader support for key flows
- [ ] Focus indicators
```

### User Stories Addressed
- US-1.2: Sample Constellation Tour
- US-2.6: Switch Between Views (3D/2D)
- US-4.5: Experience Theme Modes
- US-5.1: Generate Speculative Ancestors
- US-5.2: Generate Speculative Portraits
- US-6.2: Browse by Surname
- US-8.2: Digital Frame Mode

### Definition of Done
- Can toggle between 3D and 2D views
- Sample tour available for new users
- Frame mode displays on TV via Chromecast
- Can generate speculative ancestors with clear visual distinction
- 1000+ person constellations render at 60fps (desktop)
- Passes accessibility audit
- 90+ Lighthouse score

### Success Metrics
- Mobile/iPad session length comparable to desktop
- LCP <2.5s, FID <100ms
- Accessibility audit passed (WCAG 2.1 AA)
- Frame mode adoption by Premium users

### Technical References
- Speculation: [05_features.md](05_features.md) section 4.8
- 2D View: [05_features.md](05_features.md) section 4.13
- Frame Mode: [05_features.md](05_features.md) section 4.11

---

## Feature Prioritization Matrix

### Must Have (Phase 0 + Phase 1)
- Authentication (Firebase Auth)
- Constellation/person CRUD
- 3D visualization with navigation
- Parent-child and spouse relationships
- Notes and events
- Photo and document upload
- Search
- Subscription/billing (LemonSqueezy)
- Data export (GEDCOM)

### Should Have (Phase 2)
- AI biography generation
- AI content extraction
- Audio transcription
- Suggestion review workflow

### Could Have (Phase 3 + Phase 4)
- User connections
- Tree matching
- Share links
- 2D tree view
- Frame mode
- Speculative ancestry

### Won't Have (Future Consideration)
- DNA integration
- Record hints (Ancestry-style)
- Native mobile apps (iOS/Android)
- VR experience
- Automated metadata sync (US-7.7)

---

## Technical Dependencies

```
Phase 0 (Foundation):
  ├── GCP Infrastructure
  ├── Firebase Auth
  ├── PostgreSQL + Prisma
  ├── Next.js + GraphQL Yoga
  └── Three.js 3D scene
        │
        ▼
Phase 1 (MVP):
  ├── Person CRUD (needs DB, API)
  ├── Constellation render (needs 3D, data)
  ├── Content (needs person CRUD)
  └── Billing (needs auth, user entity)
        │
        ▼
Phase 2 (AI Enhancement):
  ├── Biography gen (needs notes/events)
  ├── Extraction (needs content)
  └── Transcription (needs media upload)
        │
        ▼
Phase 3 (Social & Matching):
  ├── Connections (needs auth, users)
  ├── Matching (needs people, can use AI)
  └── Share links (needs constellation)
        │
        ▼
Phase 4 (Polish & Advanced):
  ├── 2D view (needs constellation data)
  ├── Frame mode (needs 3D renderer)
  ├── Speculation (needs AI, people CRUD)
  └── Performance (needs features to optimize)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 3D performance on mobile/iPad | Early iPad testing; fallback to 2D view; simplified shaders |
| AI costs at scale | User quotas (15 free, 100 premium); caching; batch processing |
| Matching quality | Start with high-confidence only (60+ threshold); manual matching first |
| User adoption | Focus on single-player value in MVP; social features in Phase 3 |
| Solo developer bandwidth | AI agent orchestration for parallelization; vertical slices for incremental value |
| Beta feedback volume | Closed beta with waitlist; controlled invite pace |

---

## Success Metrics by Phase

### Phase 0: Foundation
- [ ] All infrastructure provisioned and tested
- [ ] Auth flow working end-to-end
- [ ] 3D scene renders placeholder data
- [ ] CI/CD deploys successfully

### Phase 1: MVP (Closed Beta)
- [ ] Onboarding completion rate >70%
- [ ] Average 10+ people created in first session
- [ ] <3s initial load for 100-person tree
- [ ] Subscription conversion rate tracked (baseline)
- [ ] Beta user satisfaction survey >4/5

### Phase 2: AI Enhancement
- [ ] AI suggestion acceptance rate >30%
- [ ] Biography generation satisfaction >70%
- [ ] Transcription accuracy >90%
- [ ] AI operations within budget ($100/month estimate)

### Phase 3: Social & Matching
- [ ] Match acceptance rate >50%
- [ ] Connection-driven return visits
- [ ] Share link usage (views per link)

### Phase 4: Polish & Advanced
- [ ] 90+ Lighthouse performance score
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] 1000+ person constellations at 60fps
- [ ] Frame mode used by >20% of Premium users

---

## Resolved Decisions

### Q12.1: MVP Scope

**Decision**: Richer MVP (Auth + Person CRUD + 3D + Notes/Events/Media + Subscription/Billing)

**Rationale**: Complete single-player experience before launch. Users should be able to create a meaningful family constellation with stories, not just data. Billing in MVP ensures revenue model validated early.

---

### Q12.2: Beta/Pilot Approach

**Decision**: Closed beta with waitlist

**Rationale**:
- Lower risk: Controlled user count allows rapid iteration
- Better feedback: Engaged early users provide quality feedback
- Quality focus: Fix issues before wider exposure
- Invite mechanism creates exclusivity and anticipation

**Implementation**:
- Landing page with waitlist signup (email)
- Manual invite batches (e.g., 10-20 users per week)
- Feedback channels: in-app feedback form, email, optional user interviews
- Beta badge visible in app

---

### Q12.3: Feature Flags Strategy

**Decision**: Environment variables (simple boolean flags)

**Rationale**:
- Early stage doesn't need dynamic targeting or A/B testing
- Simple implementation: `FEATURE_AI_EXTRACTION=true` in env
- Rebuild to toggle (acceptable for current pace)
- Can upgrade to LaunchDarkly later if needed

**Example flags**:
```bash
FEATURE_AI_BIOGRAPHY=true
FEATURE_AI_TRANSCRIPTION=false
FEATURE_CONNECTIONS=false
FEATURE_MATCHING=false
FEATURE_FRAME_MODE=false
FEATURE_SPECULATION=false
```

---

### Q12.4: Team Allocation

**Decision**: Solo developer with AI agent orchestration

**Rationale**:
- Single expert developer using AI coding assistants (Claude, Cursor, etc.)
- AI agents can parallelize independent tasks
- Reduces coordination overhead
- Maintains consistent code style and architecture decisions

**Approach**:
- Use AI for code generation, testing, documentation
- Parallelize independent feature work via agent sessions
- Human review and integration of AI-generated code
- Focus human effort on architecture decisions, UX design, code review

---

## Launch Plan

### Closed Beta Launch

**Prerequisites** (end of Phase 1):
- [ ] MVP features complete and tested
- [ ] Production environment stable
- [ ] Monitoring and alerting operational
- [ ] Support email configured
- [ ] Privacy policy and terms of service published
- [ ] Feedback collection mechanism ready

**Launch Sequence**:
1. **Week 1**: Internal testing (founder + close contacts)
2. **Week 2**: First beta cohort (10 users from waitlist)
3. **Week 3-4**: Iterate based on feedback
4. **Week 5+**: Expand beta invites (20-50 users per batch)
5. **Ongoing**: Continuous feedback → iteration cycle

**Exit Criteria for Open Launch**:
- No critical bugs for 2 weeks
- User satisfaction >4/5
- Core flows stable (<1% error rate)
- Payment flow verified working
- Support load manageable

---

*Status: Complete - All decisions resolved 2026-01-12*