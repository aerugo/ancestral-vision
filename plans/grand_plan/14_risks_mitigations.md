# Ancestral Vision: Risks & Mitigations

> **Status**: COMPLETE - Risk register with mitigations defined

This document catalogs risks to the Ancestral Vision project and their mitigations.

**Cross-References**:
- Development workflow risks mitigated by [13_development.md](13_development.md)
- Security risks addressed in [10_security_privacy.md](10_security_privacy.md)
- Infrastructure risks addressed in [11_deployment_operations.md](11_deployment_operations.md)

---

## Risk Matrix

| Severity | Likelihood | Priority |
|----------|------------|----------|
| High | High | Critical |
| High | Medium | High |
| High | Low | Medium |
| Medium | High | High |
| Medium | Medium | Medium |
| Medium | Low | Low |
| Low | Any | Low |

---

## Technical Risks

### T1: 3D Performance on Mobile

**Risk**: WebGL performance on mobile devices may be inadequate for complex constellations.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| High | Medium | High |

**Impact**:
- Poor user experience on mobile
- Limited market reach
- Negative reviews

**Indicators**:
- <30 FPS on mid-range mobile devices
- Battery drain complaints
- Heat complaints

**Mitigations**:
- [ ] Early mobile performance testing
- [ ] Implement LOD (Level of Detail) system
- [ ] Reduce node count on mobile
- [ ] Consider 2D fallback view
- [ ] Optimize shaders for mobile GPUs
- [ ] Test on low-end devices during development

**Contingency**:
- Ship with 2D view for mobile if 3D isn't viable

---

### T2: AI Cost Explosion

**Risk**: AI operations (Gemini, Speech-to-Text, Imagen) costs could become unsustainable at scale.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| High | High | Critical |

**Impact**:
- Unsustainable unit economics
- Need to limit features or raise prices
- Competitive disadvantage

**Indicators**:
- Cost per active user > $X/month
- AI costs > 50% of revenue
- Heavy users consuming disproportionate resources

**Mitigations**:
- [ ] Implement per-user quotas
- [ ] Cache AI results aggressively
- [ ] Batch operations where possible
- [ ] Use cheaper models where quality allows
- [ ] Build cost tracking from day 1
- [ ] Set hard spending limits per user

**Contingency**:
- Tiered pricing with AI usage limits
- Premium tier for heavy AI users

---

### T3: Real-time Sync Complexity

**Risk**: Real-time collaboration features may introduce significant complexity and bugs.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Medium | High | High |

**Impact**:
- Data inconsistencies
- Lost user data
- Delayed timeline

**Indicators**:
- Sync conflicts in testing
- Data corruption reports
- Performance degradation with multiple editors

**Mitigations**:
- [ ] Start with single-editor model
- [ ] Implement optimistic locking
- [ ] Build robust conflict resolution
- [ ] Extensive testing of edge cases
- [ ] Consider CRDT for future

**Contingency**:
- Limit real-time features to notifications only
- Manual merge for conflicts

---

### T4: Database Query Performance

**Risk**: Ancestry queries (all ancestors, all descendants, paths) may not scale with large trees.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Medium | Medium | Medium |

**Impact**:
- Slow page loads
- Timeout errors
- Poor user experience

**Indicators**:
- Query time > 1s for large trees
- Database CPU spikes
- User complaints about speed

**Mitigations**:
- [ ] Benchmark with synthetic large trees (5000+ people)
- [ ] Optimize recursive CTEs
- [ ] Consider materialized paths
- [ ] Add appropriate indexes
- [ ] Cache computed ancestry

**Contingency**:
- Pre-compute ancestry on write
- Limit query depth

---

### T5: WebGPU Transition

**Risk**: If we choose WebGL, may need to rewrite for WebGPU as it becomes standard.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Low | Medium | Low |

**Impact**:
- Significant rewrite effort
- Temporary feature freeze
- Technical debt

**Mitigations**:
- [ ] Abstract rendering layer
- [ ] Follow Three.js WebGPU support
- [ ] Plan for gradual migration

---

## Product Risks

### P1: Market Education Required

**Risk**: Users may not understand the "constellation" metaphor or value proposition.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| High | Medium | High |

**Impact**:
- Low conversion rates
- High churn
- Marketing cost increase

**Indicators**:
- Users confused during onboarding
- Low feature adoption
- "I don't get it" feedback

**Mitigations**:
- [ ] Excellent onboarding experience
- [ ] Video tutorials
- [ ] Sample constellation to explore
- [ ] Clear value proposition messaging
- [ ] User research during development

**Contingency**:
- Offer traditional tree view alongside
- Simplify messaging

---

### P2: Speculation Ethics Backlash

**Risk**: AI-generated speculative ancestors could be seen as misleading or offensive.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Medium | Medium | Medium |

**Impact**:
- PR issues
- User complaints
- Regulatory scrutiny

**Indicators**:
- Social media criticism
- Complaints about false information
- Cultural sensitivity issues

**Mitigations**:
- [ ] Clear "speculative" labeling
- [ ] Opt-in for speculation features
- [ ] Extensive disclaimers
- [ ] Cultural sensitivity review
- [ ] Easy deletion of speculative content
- [ ] No speculation on living persons

**Contingency**:
- Disable speculation feature
- Rebrand as "what-if" exploration

---

### P3: Network Effect Chicken-and-Egg

**Risk**: Matching features require other users to have content; early adopters may find no matches.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Medium | High | High |

**Impact**:
- Key feature unusable at launch
- User disappointment
- Churn

**Indicators**:
- Low match rates
- Users abandoning matching feature
- "No one else has my family" feedback

**Mitigations**:
- [ ] Focus on single-player value first
- [ ] Geographic/ethnic community targeting
- [ ] Partnership with genealogy communities
- [ ] Seed data from public family trees?
- [ ] Clear expectation setting

**Contingency**:
- De-emphasize matching until critical mass
- Focus on other differentiators

---

### P4: Privacy Concerns

**Risk**: Users may be hesitant to share family information, especially with AI processing.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Medium | Medium | Medium |

**Impact**:
- Low adoption
- Limited content sharing
- Matching feature underutilized

**Indicators**:
- Users choosing "private" for everything
- Low connection acceptance rate
- Privacy-related support tickets

**Mitigations**:
- [ ] Clear privacy controls
- [ ] Transparent data usage policy
- [ ] No selling of user data
- [ ] Local-first options where possible
- [ ] GDPR compliance
- [ ] Easy data deletion

---

## Business Risks

### B1: Competitive Response

**Risk**: Ancestry.com, MyHeritage, or FamilySearch could add similar visualization features.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| High | Medium | High |

**Impact**:
- Lost differentiation
- Harder user acquisition
- Price pressure

**Indicators**:
- Competitor announcements
- Feature parity development
- Aggressive pricing

**Mitigations**:
- [ ] Move fast
- [ ] Focus on emotional experience, not just features
- [ ] Build community and switching costs
- [ ] Patent consideration (if applicable)
- [ ] Continuous innovation

**Contingency**:
- Pivot to niche market (specific ethnicities, regions)
- White-label to competitors

---

### B2: Google AI Dependency

**Risk**: Heavy reliance on Google AI services creates vendor lock-in and pricing risk.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Medium | Medium | Medium |

**Impact**:
- Price increases
- Service deprecation
- API changes

**Indicators**:
- Google pricing changes
- Service retirement announcements
- API stability issues

**Mitigations**:
- [ ] Abstract AI layer
- [ ] Monitor alternative providers
- [ ] Maintain ability to switch
- [ ] Negotiate committed use discounts

**Contingency**:
- Multi-provider strategy
- Self-hosted models for some features

---

### B3: Unit Economics

**Risk**: Cost per user may exceed revenue per user.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| High | Medium | High |

**Impact**:
- Unsustainable business
- Need for additional funding
- Feature cuts

**Indicators**:
- LTV < CAC
- Negative gross margins
- Increasing cost per user over time

**Mitigations**:
- [ ] Track unit economics from day 1
- [ ] Set cost budgets per feature
- [ ] Design for efficiency
- [ ] Premium tier for heavy users
- [ ] Usage-based pricing consideration

**Contingency**:
- Raise prices
- Limit free tier
- Seek funding

---

## Operational Risks

### O1: Data Loss

**Risk**: User data could be lost due to bugs, infrastructure failure, or security breach.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Critical | Low | High |

**Impact**:
- User trust destroyed
- Legal liability
- Company-ending event

**Mitigations**:
- [ ] Automated backups with verification
- [ ] Multi-region redundancy
- [ ] Backup restoration testing
- [ ] Immutable audit logs
- [ ] User data export feature

---

### O2: Security Breach

**Risk**: Unauthorized access to user data.

| Severity | Likelihood | Priority |
|----------|------------|----------|
| Critical | Low | High |

**Impact**:
- Legal liability
- Reputation damage
- User churn

**Mitigations**:
- [ ] Security-first development
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] Incident response plan

---

## Risk Register

| ID | Risk | Priority | Owner | Status |
|----|------|----------|-------|--------|
| T1 | Mobile 3D performance | High | TBD | Open |
| T2 | AI cost explosion | Critical | TBD | Open |
| T3 | Real-time sync complexity | High | TBD | Open |
| T4 | DB query performance | Medium | TBD | Open |
| T5 | WebGPU transition | Low | TBD | Open |
| P1 | Market education | High | TBD | Open |
| P2 | Speculation ethics | Medium | TBD | Open |
| P3 | Network effect | High | TBD | Open |
| P4 | Privacy concerns | Medium | TBD | Open |
| B1 | Competitive response | High | TBD | Open |
| B2 | Google AI dependency | Medium | TBD | Open |
| B3 | Unit economics | High | TBD | Open |
| O1 | Data loss | High | TBD | Open |
| O2 | Security breach | High | TBD | Open |

---

## Review Cadence

- [ ] Weekly: Critical and High priority risks
- [ ] Monthly: All risks
- [ ] Quarterly: Risk register update

---

*Status: Complete - Risk register established 2026-01-12*
