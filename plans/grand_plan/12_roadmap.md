# Ancestral Vision: Development Roadmap

> **Status**: SCAFFOLD - Phases outlined, scope and timing TBD

This document outlines the development roadmap for Ancestral Vision.

---

## Roadmap Philosophy

- **Vertical slices**: Each phase delivers usable functionality
- **Core first**: Build foundation before advanced features
- **Feedback loops**: Launch early, iterate based on feedback
- **No time estimates**: Scope defined, timing determined by team capacity

---

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| 0 | Foundation | Architecture, infrastructure, auth | Not Started |
| 1 | Core Experience | 3D constellation, basic CRUD | Not Started |
| 2 | Content Depth | Notes, events, media | Not Started |
| 3 | AI Integration | Discovery, suggestions | Not Started |
| 4 | Social & Matching | Connections, tree matching | Not Started |
| 5 | Polish & Scale | Performance, mobile, accessibility | Not Started |
| 6 | Advanced Features | Speculation, frame mode, etc. | Not Started |

---

## Phase 0: Foundation

### Goals
- Establish technical architecture
- Set up infrastructure
- Implement authentication
- Create development workflow

### Deliverables

```markdown
- [ ] Technology decisions finalized (06_technology_decisions.md)
- [ ] Development environment setup documented
- [ ] CI/CD pipeline operational
- [ ] Authentication system working
- [ ] Base API structure (empty endpoints)
- [ ] Database schema v1 migrated
- [ ] Frontend scaffold with routing
- [ ] 3D renderer integrated (basic)
```

### Definition of Done
- Can register, login, logout
- Can deploy to staging environment
- Basic 3D scene renders (placeholder data)

---

## Phase 1: Core Experience

### Goals
- Users can create and view their constellation
- Basic person CRUD
- 3D visualization with real data

### Deliverables

```markdown
- [ ] Constellation creation/management
- [ ] Person CRUD (create, read, update, delete)
- [ ] Relationship management (parent-child, spouse)
- [ ] 3D constellation rendering with real data
- [ ] Person selection and camera navigation
- [ ] Basic person profile view
- [ ] Generation calculation
- [ ] Biography weight visualization
```

### Definition of Done
- Can create a constellation with 10+ people
- Can navigate 3D constellation
- Can view and edit person details

---

## Phase 2: Content Depth

### Goals
- Rich content for each person
- Events and notes
- Media upload and management

### Deliverables

```markdown
- [ ] Events system (add, edit, delete)
- [ ] Event types and shared events
- [ ] Notes system with categories
- [ ] Rich text editing for notes
- [ ] Privacy levels (private, connections, public)
- [ ] Photo upload and gallery
- [ ] Document upload
- [ ] Audio upload
- [ ] Media association with people
- [ ] Event satellites in 3D view
```

### Definition of Done
- Can add events to timeline
- Can write rich-text notes
- Can upload and view photos
- Events visible as satellites in 3D

---

## Phase 3: AI Integration

### Goals
- AI-powered discovery
- Biography generation
- Smart suggestions

### Deliverables

```markdown
- [ ] Gemini integration (direct or Vertex AI)
- [ ] Biography generation from notes
- [ ] Data extraction from text
- [ ] Suggestion engine
- [ ] Suggestion review UI
- [ ] Audio transcription
- [ ] Extraction from transcripts
- [ ] AI operation quotas/limits
- [ ] Cost tracking
```

### Definition of Done
- Can generate biography for a person
- Can transcribe audio recording
- Receives suggestions for new people/events
- Can accept/reject suggestions

---

## Phase 4: Social & Matching

### Goals
- Connect with other users
- Match trees with others
- Share content

### Deliverables

```markdown
- [ ] User connections (request, accept, block)
- [ ] Content sharing with connections
- [ ] Match suggestion algorithm
- [ ] Match proposal UI
- [ ] Match acceptance flow
- [ ] View matched person's shared content
- [ ] Activity notifications
- [ ] Connection activity feed
```

### Definition of Done
- Can connect with another user
- Can find matches for ancestors
- Can see others' shared notes on matched people

---

## Phase 5: Polish & Scale

### Goals
- Production-ready performance
- Mobile experience
- Accessibility

### Deliverables

```markdown
- [ ] Mobile-responsive design
- [ ] Touch controls for 3D
- [ ] Performance optimization (large trees)
- [ ] PWA support (offline basics)
- [ ] Accessibility audit and fixes
- [ ] Search improvements
- [ ] Loading states and skeletons
- [ ] Error handling improvements
- [ ] Analytics integration
```

### Definition of Done
- Works well on mobile devices
- Handles 1000+ person constellations
- Passes accessibility audit
- 90+ Lighthouse score

---

## Phase 6: Advanced Features

### Goals
- Differentiating features
- Speculation
- Display mode

### Deliverables

```markdown
- [ ] Speculative ancestor generation
- [ ] Speculative portrait generation (Imagen)
- [ ] Visual distinction for speculative content
- [ ] Confirm speculative → known workflow
- [ ] Digital frame mode
- [ ] Casting support
- [ ] Advanced search and filtering
- [ ] Data export (GEDCOM, JSON)
- [ ] Data import
```

### Definition of Done
- Can generate speculative ancestors
- Can display constellation on TV
- Can export data in standard format

---

## Feature Prioritization Matrix

### Must Have (MVP)
- Authentication
- Constellation/person CRUD
- 3D visualization
- Basic relationships
- Notes and events

### Should Have (V1.0)
- Media upload
- AI biography generation
- Basic matching
- User connections

### Could Have (V1.x)
- Audio transcription
- Smart suggestions
- Speculative ancestry
- Frame mode

### Won't Have (Future)
- DNA integration
- Record hints (Ancestry-style)
- Native mobile apps
- VR experience

---

## Technical Dependencies

```
Phase 0:
  └── Phase 1 (needs auth, DB, basic API)
        └── Phase 2 (needs person CRUD)
        └── Phase 3 (needs content to analyze)
              └── Phase 4 (needs AI for matching)

Phase 2 + Phase 3 + Phase 4:
  └── Phase 5 (needs features to polish)

Phase 3:
  └── Phase 6 (speculation needs AI)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 3D performance on mobile | Early mobile testing, fallback 2D view |
| AI costs at scale | Quotas, caching, batch processing |
| Matching quality | Start with high-confidence only |
| User adoption | Focus on single-player value first |

---

## Success Metrics

### Phase 1
- Users can create constellation
- <3s load time for 100-person tree

### Phase 2
- Average 5+ notes per active person
- Media upload success rate >95%

### Phase 3
- AI suggestion acceptance rate >30%
- Biography generation satisfaction >70%

### Phase 4
- Match acceptance rate >50%
- Connection-driven return visits

### Phase 5
- Mobile session length comparable to desktop
- LCP <2.5s, FID <100ms

---

## Open Questions

```
Q11.1: MVP scope?
- What's the minimum for first user-facing release?
- Decision: _______________

Q11.2: Beta/pilot approach?
- Closed beta with waitlist
- Open beta
- Soft launch
- Decision: _______________

Q11.3: Feature flags strategy?
- How to manage partial rollouts
- Tool: _______________

Q11.4: Team allocation?
- How many developers?
- Full-time vs part-time?
- Specialist roles needed?
```

---

*Status: Scaffold - Awaiting Scope Decisions*
