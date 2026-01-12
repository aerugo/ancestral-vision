# Ancestral Vision: Grand Plan Index

This directory contains the comprehensive planning documentation for Ancestral Vision.

---

## Document Status Legend

| Status | Meaning |
|--------|---------|
| Complete | Document finalized, no decisions pending |
| Scaffold | Structure in place, decisions/details needed |
| Draft | Work in progress |
| Not Started | Planned but not yet created |

---

## Documents

| # | Document | Purpose | Status |
|---|----------|---------|--------|
| 00 | [Index](00_index.md) | This file - navigation and status | Complete |
| 01 | [Executive Summary](01_summary.md) | Vision and differentiators | Complete |
| 02 | [Product Pitch](02_pitch.md) | Value proposition and positioning | Complete |
| 03 | [Core Concepts](03_core_concepts.md) | Constellation metaphor, data concepts | Complete |
| 04 | [User Stories](04_user_stories.md) | User personas and stories | Complete |
| 05 | [Features Specification](05_features.md) | All features with decisions | Complete |
| 06 | [Technical Foundation](06_technical_foundation.md) | Existing codebase analysis | Complete |
| 07 | [Technology Decisions](07_technology_decisions.md) | Tech stack decisions | Complete |
| 08 | [Data Model](08_data_model.md) | Entity definitions and relationships | Complete |
| 09 | [API Specification](09_api_specification.md) | Endpoint definitions | Scaffold |
| 10 | [Security & Privacy](10_security_privacy.md) | Security architecture, privacy model | Scaffold |
| 11 | [Deployment & Operations](11_deployment_operations.md) | Infrastructure and DevOps | Scaffold |
| 12 | [Development Roadmap](12_roadmap.md) | Phased delivery plan | Scaffold |
| 13 | [Risks & Mitigations](13_risks_mitigations.md) | Risk register | Scaffold |

---

## Decision Tracking

### Blocking Decisions - RESOLVED

All blocking technology decisions have been resolved in 07_technology_decisions.md:

| Decision | Choice | Status |
|----------|--------|--------|
| Frontend Framework | React + Next.js | DECIDED |
| API Architecture | GraphQL (Yoga) | DECIDED |
| Primary Database | PostgreSQL (Cloud SQL) + Prisma | DECIDED |
| Auth Provider | Firebase Auth | DECIDED |
| AI Agent Framework | Genkit | DECIDED |
| 3D Technology | WebGPU + WebGL fallback | DECIDED |

### Remaining Open Questions

See individual documents for complete question lists:
- ~~05_features.md: Q5.1.x - Q5.11.x (Feature decisions)~~ ✓ Complete
- ~~06_technical_foundation.md: Q6.x (Integration decisions)~~ ✓ Complete
- ~~08_data_model.md: Q8.x (Data model decisions)~~ ✓ Complete
- 09_api_specification.md: Q9.x (API decisions)
- 10_security_privacy.md: Q10.x (Security decisions)
- 11_deployment_operations.md: Q11.x (Operations decisions)
- 12_roadmap.md: Q12.x (Scope decisions)

---

## How to Use This Documentation

### For Decision Making
1. Review 04_user_stories.md to understand user needs
2. Work through each scaffold document's open questions
3. Document decisions with rationale
4. Update document status when complete

### For Development
1. Read 01-04 for context, vision, and user stories
2. Reference 05 for feature requirements
3. Use 08-09 for data/API contracts
4. Follow 11 for deployment procedures

### For Onboarding
1. Read 01-04 to understand the product and users
2. Review 06 to understand existing code
3. Check 12 for current development phase

---

## Document Dependencies

```
01_summary.md
02_pitch.md
03_core_concepts.md
    │
    ▼
04_user_stories.md
    │
    ▼
05_features.md ◄────────────────────────┐
    │                                    │
    ▼                                    │
06_technical_foundation.md              │
    │                                    │
    ▼                                    │
07_technology_decisions.md ─────────────┤
    │                                    │
    ├───► 08_data_model.md              │
    │         │                          │
    │         ▼                          │
    ├───► 09_api_specification.md       │
    │                                    │
    ├───► 10_security_privacy.md        │
    │                                    │
    └───► 11_deployment_operations.md   │
              │                          │
              ▼                          │
          12_roadmap.md ◄────────────────┘
              │
              ▼
          13_risks_mitigations.md
```

---

## Next Steps

1. **Fill in scaffold documents** with decisions
2. **Define data model** (08_data_model.md)
3. **Create detailed designs** for Phase 0 features
4. **Begin implementation**

---

*Last Updated: 2026-01-11*
