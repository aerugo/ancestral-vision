# Ancestral Vision: Security & Privacy

> **Status**: COMPLETE - All decisions resolved

This document covers security architecture and privacy considerations for Ancestral Vision.

---

## Security Overview

### Attack Surface

```
┌─────────────────────────────────────────────────────────────┐
│                     Attack Surface                           │
├─────────────────────────────────────────────────────────────┤
│ Frontend          │ XSS, CSRF, token theft                  │
│ API               │ Injection, auth bypass, rate limiting   │
│ Storage           │ Unauthorized access, data leakage       │
│ AI Integration    │ Prompt injection, data exfiltration     │
│ User Data         │ PII exposure, privacy violations        │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Security

### Auth Provider Decision
> See 07_technology_decisions.md A1: **Firebase Auth**

### Token Management

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.1: Token strategy | **Firebase-managed (1hr access + refresh)** | Firebase Auth handles token lifecycle automatically; access tokens expire after 1 hour; SDK handles refresh transparently |
| Q10.2: Token storage (frontend) | **Firebase SDK default (IndexedDB)** | Firebase SDK uses IndexedDB for persistence; handles security best practices; survives page refresh; XSS-mitigated by SDK |

### Session Security

- [x] Secure token generation (cryptographically random) - Firebase handles
- [x] Token expiration and rotation - Firebase handles (1hr access tokens)
- [x] Logout invalidates all sessions - Via Firebase signOut + optional revoke refresh tokens
- [x] Concurrent session limits - **No limit** (common for family sharing scenarios)

### Password Policy

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.3: Password requirements | **Min 8 characters, no complexity rules** | Per 05_features.md Q4.16.2; NIST guidelines recommend length over complexity; Firebase Auth enforces minimum |
| Breach database check | **No** | Firebase doesn't provide this; can add HaveIBeenPwned check in future if needed |

---

## Authorization Model

### Resource Ownership

```typescript
// Every resource has an owner
interface OwnedResource {
  ownerId: string;        // User ID (Firebase UID)
  createdBy: string;      // User who created (for shared resources)
}

// Access check per 07_technology_decisions.md A2
canAccess(user, resource) {
  if (resource.ownerId === user.id) return true;
  if (resource.privacy === 'public') return true;
  if (resource.privacy === 'connections' && isConnected(user, resource.owner)) return true;
  return false;
}
```

### Privacy Levels

| Level | Visibility |
|-------|------------|
| `private` | Only owner |
| `connections` | Owner + connected users (Family tier only) |
| `public` | Anyone (via share link or matching) |

### Matched Data Access

When trees are matched:
- Only `public` and `connections` data visible
- `private` data never exposed
- Access revoked immediately if match broken

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.4: Default privacy for new content | **Private** | Per 05_features.md Q4.16.6; conservative default protects user data; easy to share explicitly |
| Q10.5: Granularity of privacy | **Per-note/event/media** | Per 08_data_model.md; each content item has independent privacy; more flexible for sensitive photos |

---

## Data Protection

### Encryption

| Data State | Encryption | Details |
|------------|------------|---------|
| In Transit | TLS 1.3 required | Cloud Run enforces HTTPS; HSTS enabled |
| At Rest (DB) | Cloud SQL encryption | AES-256, Google-managed keys |
| At Rest (Files) | Cloud Storage encryption | AES-256, Google-managed keys |
| Sensitive Fields | Cloud encryption only | See Q10.6 rationale |

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.6: Application-level encryption | **Cloud encryption only** | Google Cloud provides encryption at rest; application-level encryption adds key management complexity; no regulatory requirement for field-level encryption |
| Q10.7: Data residency | **Single region: us-central1** | Initial launch in US; GDPR users informed of US data storage; can add EU region later if demand warrants |

### Backup & Recovery

| Component | Strategy | Retention |
|-----------|----------|-----------|
| Cloud SQL | Automated daily backups | 30 days |
| Cloud SQL | Point-in-time recovery | 7 days (binary logging) |
| Cloud Storage | Object versioning enabled | 30 days for deleted objects |
| Backup encryption | Google-managed (same as source) | N/A |

Recovery testing: Quarterly restore drills to staging environment.

---

## Privacy Considerations

### Genealogy-Specific Privacy

Genealogy data has unique privacy considerations:

1. **Living vs Deceased**: Living people have privacy rights; deceased typically don't
2. **Sensitive Information**: Health history, adoptions, DNA implications
3. **Family Secrets**: Information that could harm living family members
4. **Cultural Sensitivity**: Religious, ethnic, historical sensitivities

### Living Person Handling

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.8: Living person definition | **No death date = living** | Per 05_features.md Q4.15.4; computed field `isLiving`; simplest approach; no arbitrary age cutoffs |
| Q10.9: Living person restrictions | **Default privacy + share link exclusion** | Living persons default to `private`; never included in share links unless explicitly set to `public` by user; respects family privacy |

### GDPR Compliance

| Requirement | Implementation | Reference |
|-------------|----------------|-----------|
| Right to Access | Data export (GEDCOM, JSON, CSV) | 09_api_specification.md exportGedcom/Json/Csv |
| Right to Erasure | Account deletion with 14-day grace | 05_features.md Q4.16.3 |
| Right to Rectification | Full edit capabilities | All update mutations |
| Data Portability | Standard export formats | GEDCOM 5.5.1 industry standard |
| Consent | Explicit consent for AI processing | Modal before first AI operation |
| Data Processing Agreement | LemonSqueezy (MoR) handles payment DPA | 07_technology_decisions.md P1 |

### Data Retention

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.10: Deleted content retention | **30 days** | Per 05_features.md Q4.15.2; soft delete with Trash; permanent after 30 days |
| Deleted account retention | **14 days grace, then permanent** | Per 05_features.md Q4.16.3; allows cancellation; email reminders at 7 and 1 day |
| Inactive account handling | **No automatic deletion** | Data is valuable to users; send re-engagement emails at 6, 12 months; never auto-delete |
| Backup retention | **30 days** | Matches soft delete window; PITR for 7 days |

---

## AI Security

### Prompt Injection

Risk: User content processed by AI could contain prompt injection attacks.

Mitigations:
- [x] Input sanitization before AI processing - Strip control characters, limit length
- [x] Structured prompts with clear boundaries - Use Genkit's schema-based outputs
- [x] Output validation - Zod schema validation on all AI responses
- [x] Rate limiting on AI operations - Per 05_features.md Q4.7.4: 15/month Free, 100/month Premium

### Data Leakage

Risk: AI could expose training data or other users' data.

Mitigations:
- [x] Don't fine-tune on user data - Use base Gemini models only
- [x] Clear context boundaries per user - Each AI call includes only that user's data
- [x] No cross-user data in prompts - Strict isolation in Genkit flows
- [x] Vertex AI audit logging - All AI requests logged for review

### AI Output Validation

- [x] Validate structured outputs match schema - Genkit + Zod enforcement
- [x] Sanitize AI-generated content before display - HTML sanitization for biography display
- [x] Human review for speculative content - All AI suggestions require user approval per 05_features.md Q4.7.2

---

## API Security

### Input Validation

- [x] Schema validation on all inputs - GraphQL schema + Zod validation
- [x] Sanitize strings (XSS prevention) - DOMPurify for rich text content
- [x] Parameterized queries (SQL injection prevention) - Prisma ORM handles parameterization
- [x] File upload validation (type, size, content) - Per 05_features.md Q4.5.2: max 25MB images, type whitelist

### Rate Limiting

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.11: Rate limiting strategy | **Per-user with IP fallback** | Per 05_features.md Q4.7.5; authenticated: per-user limits; unauthenticated: per-IP |

Rate Limits (per 09_api_specification.md):

| Category | Free Tier | Premium Tier |
|----------|-----------|--------------|
| General API | 10 requests/minute | 10 requests/minute |
| Daily API calls | 50/day | 200/day |
| AI operations | 15/month | 100/month |
| File uploads | 250 MB total | 10 GB total |

### CORS Configuration

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.12: CORS policy | **Strict origin allowlist** | Production: app domain only; Development: localhost:3000 |
| Allowed origins | `https://ancestralvision.com`, `https://app.ancestralvision.com` | Explicit allowlist, no wildcards |
| Credentials | `true` | Required for Firebase Auth cookies |

---

## Frontend Security

### XSS Prevention

- [x] Content Security Policy (CSP) - Strict CSP with nonce for inline scripts
- [x] Sanitize user-generated content - DOMPurify for Tiptap content rendering
- [x] React automatic escaping - JSX escapes by default
- [x] No dangerouslySetInnerHTML with user content - Tiptap handles rich text safely

### CSP Header

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' https://apis.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://storage.googleapis.com;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### CSRF Prevention

- [x] SameSite cookies - `SameSite=Strict` for session cookies
- [x] CSRF tokens - Not needed (JWT in Authorization header, not cookies)
- [x] Origin validation - GraphQL Yoga validates Origin header

### Dependencies

- [x] Regular dependency audits - `npm audit` in CI pipeline
- [x] Automated vulnerability scanning - Dependabot enabled
- [x] Lock file integrity - `package-lock.json` committed; `npm ci` in builds

---

## Audit & Monitoring

### Audit Logging

| Event | Logged Data | Retention |
|-------|-------------|-----------|
| Login/Logout | User ID, IP, timestamp, success/failure, user agent | 90 days |
| Data Access | User ID, resource type, resource ID, action, timestamp | 30 days |
| Data Modification | User ID, resource, action, before/after (for deletes) | 90 days |
| AI Operations | User ID, operation type, input summary, token count | 90 days |
| Admin Actions | Admin ID, action, target, timestamp | 1 year |

All logs stored in Cloud Logging with appropriate IAM restrictions.

### Security Monitoring

- [x] Failed login attempt monitoring - Alert after 5 failures in 15 minutes (same IP)
- [x] Unusual access patterns - Alert on >100 API calls in 1 minute (per user)
- [x] Rate limit violations - Log and alert on repeated violations
- [x] API error spikes - Alert on >5% error rate sustained for 5 minutes

### Incident Response

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q10.13: Incident response plan | **Documented runbook** | See below |

**Incident Response Plan**:

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| Critical (data breach) | 15 minutes | Founder + on-call; GDPR notification within 72hr if EU data |
| High (service down) | 30 minutes | On-call engineer |
| Medium (degraded service) | 2 hours | Next business day review |
| Low (security improvement) | 1 week | Standard backlog |

**Contacts**:
- Primary: Engineering lead
- Escalation: Founder
- External: Legal counsel (for breach notification)

---

## Compliance Checklist

### Pre-Launch

- [ ] Security architecture review - This document
- [ ] Penetration testing - Schedule with third party before launch
- [ ] Privacy policy drafted - Include all items from section below
- [ ] Terms of service drafted - Legal review required
- [ ] Cookie consent implementation - Minimal cookies (Firebase only)
- [ ] GDPR compliance review - Data export, deletion, consent flows
- [ ] Data flow documentation - Architecture diagram with data paths

### Ongoing

- [ ] Regular security audits - Quarterly review
- [ ] Dependency updates - Weekly Dependabot reviews
- [ ] Access review - Quarterly GCP IAM audit
- [ ] Backup verification - Quarterly restore test
- [ ] Incident response drills - Annual tabletop exercise

---

## Privacy Policy Requirements

The privacy policy must address:

1. **What data is collected**
   - Account: email, display name, avatar
   - Family data: names, dates, places, relationships, biography
   - Media: photos, documents, audio recordings
   - Usage: feature usage, AI operation counts

2. **How data is used**
   - Provide family tree features
   - AI-powered suggestions and biography generation
   - Match with other users' trees (with consent)

3. **AI processing disclosure**
   - Gemini AI processes biography and notes
   - Data sent to Google Cloud (Vertex AI)
   - AI suggestions require user approval
   - No model training on user data

4. **Data sharing (matches, connections)**
   - Only public/connections content shared
   - User controls all sharing settings
   - Match requires bilateral acceptance

5. **Third-party services**
   - Google Cloud (hosting, AI, storage)
   - Firebase (authentication)
   - LemonSqueezy (payments)
   - Resend (transactional email)

6. **Data retention**
   - Active account: indefinite
   - Deleted content: 30 days in trash
   - Deleted account: 14-day grace period
   - Backups: 30 days

7. **User rights (access, deletion, export)**
   - Export: GEDCOM, JSON, CSV formats
   - Delete: Account deletion with grace period
   - Correct: Full editing capabilities

8. **Contact information**
   - Support email for privacy inquiries
   - Response within 30 days for GDPR requests

9. **Policy update notifications**
   - Email notification for material changes
   - 30-day notice before changes take effect

---

## Decision Summary

All security and privacy decisions resolved:

| Category | Key Decisions |
|----------|---------------|
| Authentication | Firebase Auth, 8-char min password, SDK-managed tokens |
| Authorization | Ownership + privacy levels, per-item granularity |
| Encryption | Cloud-managed only (no application-level) |
| Data Residency | us-central1 (single region) |
| Living Persons | Inferred from death date, default private |
| Data Retention | 30-day soft delete, 14-day account grace period |
| Rate Limiting | Per-user with tier limits |
| CORS | Strict origin allowlist |
| Incident Response | Documented runbook with severity levels |

---

*Status: Complete - All decisions resolved 2026-01-11*
