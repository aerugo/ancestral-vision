# Ancestral Vision: Deployment & Operations

> **Status**: COMPLETE - All decisions resolved

This document covers deployment architecture and operational procedures for Ancestral Vision.

---

## Infrastructure Overview

### Google Cloud Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Cloud Run | Application hosting | Next.js containerized app |
| Cloud SQL | PostgreSQL database | Per 07_technology_decisions.md B3 |
| Cloud Storage | Media files | Per 07_technology_decisions.md I4 |
| Cloud CDN | Content delivery | Per 07_technology_decisions.md I2 |
| Vertex AI | Gemini integration | Per 07_technology_decisions.md AI1 |
| Speech-to-Text V2 | Audio transcription | Per 07_technology_decisions.md AI4 |
| Cloud Logging | Centralized logging | Per 07_technology_decisions.md I3 |
| Cloud Monitoring | Metrics & alerts | Per 07_technology_decisions.md I3 |
| Cloud Error Reporting | Error tracking | Per 07_technology_decisions.md I3 |
| Secret Manager | Secrets storage | API keys, database credentials |
| Cloud Build | CI/CD pipeline | GitHub integration |

---

## Environment Strategy

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.1: Environment structure | **Development + Production** | Simpler setup for solo/small team; test on local dev before deploying to prod; add staging later if needed |
| Q11.2: Environment isolation | **Separate GCP projects per environment** | Best practice for security isolation; prevents accidental prod changes; clearer billing |

### Environment Configuration

| Environment | GCP Project | Purpose | Data |
|-------------|-------------|---------|------|
| Development | `ancestral-vision-dev` | Local development + shared dev | Seed/mock data |
| Production | `ancestral-vision-prod` | Live users | Real user data |

### Environment Variables by Environment

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | development | production |
| `DATABASE_URL` | Docker PostgreSQL | Cloud SQL prod |
| `FIREBASE_PROJECT` | ancestral-vision-dev | ancestral-vision-prod |
| `AI_PROVIDER` | Google AI Studio | Vertex AI |
| `STORAGE_TYPE` | local | gcs |

---

## Compute Architecture

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.3: Compute platform | **Cloud Run** | Per 07_technology_decisions.md I1; serverless, auto-scaling, pay-per-use; cold starts mitigated with min-instances |

### Cloud Run Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloud Load Balancer                      │
│                      + Cloud CDN (static assets)                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       Cloud Run          │
                    │   (Next.js Application)  │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │ Frontend (SSR/CSR) │  │
                    │  │ API Routes (GraphQL)│  │
                    │  │ Genkit AI Flows    │  │
                    │  └────────────────────┘  │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
   │  Cloud SQL  │       │   Cloud     │       │  Vertex AI  │
   │ (PostgreSQL)│       │  Storage    │       │  (Gemini)   │
   └─────────────┘       └─────────────┘       └─────────────┘
```

### Cloud Run Service Configuration

```yaml
# Production configuration
ancestral-vision-api:
  region: us-central1
  platform: managed
  cpu: 1
  memory: 1Gi
  minInstances: 1              # Avoid cold starts in production
  maxInstances: 100            # Cost protection
  concurrency: 80              # Requests per instance
  timeout: 300s                # 5 min for AI operations
  cpuThrottling: false         # Always-on CPU for WebSocket support

  # Environment
  env:
    - NODE_ENV=production
    - LOG_LEVEL=info

  # Secrets (from Secret Manager)
  secrets:
    - DATABASE_URL
    - FIREBASE_ADMIN_KEY
    - GOOGLE_CLOUD_PROJECT
```

---

## Database Deployment

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.4: Database sizing | **Start small, scale vertically** | db-f1-micro for dev; db-custom-2-4096 for prod; auto-storage increase enabled |

### Cloud SQL Configuration

```yaml
# Production Database
instance-id: ancestral-vision-prod-db
database-version: POSTGRES_16
region: us-central1

# Machine Type (start small, scale up based on usage)
tier: db-custom-2-4096          # 2 vCPU, 4GB RAM
                                 # Can scale to db-custom-4-8192 if needed

# Storage
storage:
  type: SSD
  sizeGb: 20                     # Initial size
  autoResize: true               # Auto-increase when 90% full
  autoResizeLimit: 100           # Max 100GB

# Availability
availability: ZONAL              # Single zone initially
                                 # Upgrade to REGIONAL for HA when revenue supports

# Backups (per 10_security_privacy.md)
backups:
  enabled: true
  startTime: "03:00"             # 3 AM UTC
  location: us                   # Multi-region backup
  retentionDays: 30              # Per 10_security_privacy.md
  pointInTimeRecovery: true      # 7-day binary log retention
  transactionLogRetentionDays: 7

# Maintenance
maintenance:
  day: SUNDAY
  hour: 4                        # 4 AM UTC

# Connections
maxConnections: 100              # Default for this tier
connectionPooling: true          # Via Cloud SQL Auth Proxy
```

### Database Migration Strategy

```bash
# Migration workflow
1. Developer creates migration: npx prisma migrate dev --name description
2. Migration tested locally with seed data
3. Migration committed to Git
4. Production deploy runs migrations automatically (Cloud Build)
```

---

## Storage Architecture

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.5: CDN setup | **Cloud CDN for all static content** | Per 07_technology_decisions.md I2; integrated with Cloud Load Balancing |

### Cloud Storage Buckets

```
gs://ancestral-vision-prod-media/
  └── users/{userId}/
      ├── photos/{uuid}.webp          # Processed images
      ├── photos/{uuid}_thumb_sm.webp # 200px thumbnail
      ├── photos/{uuid}_thumb_md.webp # 800px thumbnail
      ├── documents/{uuid}.pdf
      ├── audio/{uuid}.opus           # Transcoded audio
      └── audio/{uuid}_original.{ext} # Original preserved

gs://ancestral-vision-prod-exports/
  └── users/{userId}/
      └── exports/{uuid}.{gedcom|json|csv}

gs://ancestral-vision-prod-temp/
  └── uploads/{uuid}/                 # Processing uploads (24hr TTL)

gs://ancestral-vision-prod-backups/
  └── database/
      └── {date}/
```

### Bucket Configuration

```yaml
# Media Bucket
ancestral-vision-prod-media:
  location: US                        # Multi-region
  storageClass: STANDARD
  uniformBucketLevelAccess: true
  versioning: true                    # Per 10_security_privacy.md (30-day recovery)
  lifecycle:
    - action: Delete
      condition:
        daysSinceNoncurrentTime: 30   # Delete old versions after 30 days
  cors:
    - origin: ["https://ancestralvision.com", "https://app.ancestralvision.com"]
      method: ["GET", "PUT", "POST"]
      maxAgeSeconds: 3600

# Temp Bucket (processing)
ancestral-vision-prod-temp:
  location: US
  storageClass: STANDARD
  lifecycle:
    - action: Delete
      condition:
        age: 1                        # Delete after 24 hours

# Backup Bucket
ancestral-vision-prod-backups:
  location: US                        # Multi-region for DR
  storageClass: NEARLINE
  lifecycle:
    - action: SetStorageClass
      storageClass: COLDLINE
      condition:
        age: 30
    - action: Delete
      condition:
        age: 365                      # 1 year retention
```

### Signed URL Configuration

```typescript
// Media access via signed URLs
const signedUrlConfig = {
  action: 'read',
  expires: Date.now() + 60 * 60 * 1000, // 1 hour (per 10_security_privacy.md)
};

// Upload via signed URLs
const uploadUrlConfig = {
  action: 'write',
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  contentType: 'application/octet-stream',
};
```

---

## CDN Configuration

### Cloud CDN Setup

```yaml
# Backend service for Cloud Run
backend-service:
  backends:
    - group: cloud-run-neg
      balancingMode: UTILIZATION
  cdnPolicy:
    cacheMode: CACHE_ALL_STATIC
    defaultTtl: 3600                  # 1 hour default
    maxTtl: 86400                     # 24 hours max
    negativeCaching: true
    serveWhileStale: 86400            # Serve stale for 24hr during errors

# Cache key policy
cacheKeyPolicy:
  includeHost: true
  includeProtocol: true
  includeQueryString: true
```

### Cache Strategy

| Content Type | TTL | Cache-Control Header |
|--------------|-----|---------------------|
| Static assets (JS, CSS, fonts) | 1 year | `public, max-age=31536000, immutable` |
| Next.js static pages | 1 hour | `public, max-age=3600, stale-while-revalidate=86400` |
| Images (media) | 1 week | `public, max-age=604800` |
| API responses | No cache | `private, no-store, no-cache` |
| GraphQL | No cache | `private, no-store` |

---

## CI/CD Pipeline

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.6: Deployment strategy | **Rolling update** | Cloud Run default; zero-downtime; automatic rollback on health check failure |

### Pipeline Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   GitHub     │───>│ Cloud Build  │───>│   Artifact   │───>│  Cloud Run   │
│   Push       │    │   Trigger    │    │   Registry   │    │   Deploy     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                                       │
       │                   ▼                                       ▼
       │            ┌──────────────┐                        ┌──────────────┐
       │            │   Tests      │                        │   Health     │
       │            │   Lint       │                        │   Check      │
       │            │   Type Check │                        │   Rollback   │
       │            └──────────────┘                        └──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Branch Strategy                                                          │
│  main ──────────────────────────────────────────────> Production         │
│  feature/* ─────> PR ─────> main (squash merge)                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Install dependencies
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['ci']
    id: 'install'

  # Lint
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'lint']
    id: 'lint'
    waitFor: ['install']

  # Type check
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'typecheck']
    id: 'typecheck'
    waitFor: ['install']

  # Unit tests
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test']
    id: 'test'
    waitFor: ['install']

  # Build Next.js
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'build']
    id: 'build'
    waitFor: ['lint', 'typecheck', 'test']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:latest'
      - '.'
    id: 'docker-build'
    waitFor: ['build']

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:$COMMIT_SHA'
    id: 'docker-push'
    waitFor: ['docker-build']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'ancestral-vision-api'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/ancestral-vision/api:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
    id: 'deploy'
    waitFor: ['docker-push']

  # Run database migrations
  - name: 'node:20'
    entrypoint: 'npx'
    args: ['prisma', 'migrate', 'deploy']
    env:
      - 'DATABASE_URL=$$DATABASE_URL'
    secretEnv: ['DATABASE_URL']
    id: 'migrate'
    waitFor: ['deploy']

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/DATABASE_URL/versions/latest
      env: 'DATABASE_URL'

timeout: '1200s'  # 20 minutes

# Trigger configuration (separate file or console)
# triggers:
#   - name: deploy-production
#     branch: main
#     includedFiles: ['src/**', 'package.json', 'prisma/**']
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## Monitoring & Observability

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.7: Error tracking | **Cloud Error Reporting** | Per 07_technology_decisions.md I3; Google-native; automatic error grouping; integrated with Cloud Logging |

### Logging Configuration

```yaml
# Structured logging format (JSON)
logFormat:
  timestamp: ISO8601
  severity: INFO|WARNING|ERROR|CRITICAL
  service: ancestral-vision-api
  version: $COMMIT_SHA
  traceId: from Cloud Trace header
  spanId: from Cloud Trace header
  userId: authenticated user ID (if available)
  message: log message
  context: additional structured data

# Log routing
logSinks:
  # All logs to BigQuery for analysis
  - name: all-logs-to-bigquery
    destination: bigquery.googleapis.com/projects/$PROJECT/datasets/logs
    filter: ""

  # Error logs to Pub/Sub for alerting
  - name: errors-to-pubsub
    destination: pubsub.googleapis.com/projects/$PROJECT/topics/error-alerts
    filter: severity >= ERROR

# Retention
retention:
  cloudLogging: 30 days
  bigQuery: 90 days
```

### Metrics & Alerts

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| Error rate (5xx) | > 1% for 5 min | > 5% for 2 min | Page on-call |
| Latency (p95) | > 2s for 5 min | > 5s for 2 min | Page on-call |
| Latency (p99) | > 5s for 5 min | > 10s for 2 min | Email |
| CPU utilization | > 70% for 10 min | > 90% for 5 min | Auto-scale + email |
| Memory utilization | > 80% for 10 min | > 95% for 5 min | Page on-call |
| Database connections | > 80% of max | > 95% of max | Page on-call |
| Failed logins | > 50/min | > 100/min | Email + investigate |
| AI quota usage | > 80% of limit | > 95% of limit | Email user |
| Storage quota usage | > 80% of limit | > 95% of limit | Email user |

### Alert Configuration

```yaml
# Cloud Monitoring alert policies
alertPolicies:
  - displayName: "High Error Rate"
    conditions:
      - displayName: "Error rate > 5%"
        conditionThreshold:
          filter: |
            resource.type = "cloud_run_revision"
            metric.type = "run.googleapis.com/request_count"
            metric.labels.response_code_class = "5xx"
          aggregations:
            alignmentPeriod: 60s
            perSeriesAligner: ALIGN_RATE
          comparison: COMPARISON_GT
          thresholdValue: 0.05
          duration: 120s
    notificationChannels:
      - email-oncall
      - pagerduty-critical
    alertStrategy:
      autoClose: 1800s  # 30 minutes

  - displayName: "High Latency"
    conditions:
      - displayName: "p95 latency > 2s"
        conditionThreshold:
          filter: |
            resource.type = "cloud_run_revision"
            metric.type = "run.googleapis.com/request_latencies"
          aggregations:
            alignmentPeriod: 60s
            perSeriesAligner: ALIGN_PERCENTILE_95
          comparison: COMPARISON_GT
          thresholdValue: 2000  # 2000ms
          duration: 300s
    notificationChannels:
      - email-oncall
```

### Dashboards

**1. Overview Dashboard**
- Request rate (requests/sec)
- Error rate (%)
- Latency percentiles (p50, p95, p99)
- Active instances
- Active users (last 24h)

**2. Infrastructure Dashboard**
- CPU utilization by revision
- Memory utilization by revision
- Database connections (active/available)
- Database CPU/memory
- Storage usage by bucket

**3. AI Operations Dashboard**
- AI requests by operation type
- Token usage (input/output)
- AI operation latency
- Cost tracking (estimated)
- Error rate by model

**4. Business Metrics Dashboard**
- New user signups
- Active users (DAU/WAU/MAU)
- Subscription conversions
- AI operations per user
- Storage per user

---

## Scaling Configuration

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.8: Database scaling | **Connection pooling + vertical scaling** | Start with Cloud SQL Auth Proxy pooling; scale instance vertically; add read replica only if read-heavy patterns emerge |

### Cloud Run Auto-scaling

```yaml
# Production scaling
scaling:
  minInstances: 1                # Always warm (avoid cold starts)
  maxInstances: 100              # Cost protection

  # Scaling triggers
  targetCPUUtilization: 70%      # Scale up at 70% CPU
  targetConcurrentRequests: 80   # Scale up at 80 concurrent requests

# Cost optimization tiers (based on traffic)
trafficTiers:
  low:      # < 100 req/min
    minInstances: 1
    maxInstances: 5
  medium:   # 100-1000 req/min
    minInstances: 2
    maxInstances: 20
  high:     # > 1000 req/min
    minInstances: 5
    maxInstances: 100
```

### Database Connection Pooling

```yaml
# Cloud SQL Auth Proxy configuration
cloudSqlProxy:
  instances: $PROJECT:us-central1:ancestral-vision-prod-db
  maxConnections: 100
  minConnections: 5

# Prisma connection pool
prisma:
  connectionLimit: 10            # Per Cloud Run instance
  poolTimeout: 10                # Seconds to wait for connection
```

### Scaling Triggers

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU | > 70% for 60s | < 30% for 300s |
| Memory | > 80% for 60s | < 40% for 300s |
| Request queue | > 100 pending | < 10 pending |
| Concurrent requests | > 80/instance | < 20/instance |

---

## Disaster Recovery

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.9: Recovery targets | **RTO: 4 hours, RPO: 1 hour** | Genealogy data is important but not mission-critical; PITR enables 1-hour RPO; 4-hour RTO allows manual intervention |

### RTO/RPO Targets

| Scenario | RTO | RPO | Recovery Method |
|----------|-----|-----|-----------------|
| Database corruption | 1 hour | 5 minutes | Point-in-time recovery |
| Database failure | 4 hours | 1 hour | Restore from backup |
| Region failure | 8 hours | 1 hour | Cross-region restore |
| Complete disaster | 24 hours | 1 hour | Full rebuild from backups |

### Backup Strategy

| Data | Backup Method | Frequency | Retention | Location |
|------|---------------|-----------|-----------|----------|
| Database | Cloud SQL automated | Daily | 30 days | Multi-region (US) |
| Database | Point-in-time recovery | Continuous | 7 days | Same region |
| Media files | Object versioning | On change | 30 days | Same bucket |
| Media files | Cross-region copy | Daily | 30 days | Different region |
| Configuration | Git | On commit | Forever | GitHub |
| Secrets | Secret Manager versioning | On change | 10 versions | Same project |

### Recovery Procedures

**1. Database Recovery (< 1 hour RTO)**
```bash
# Point-in-time recovery (preferred)
gcloud sql instances clone ancestral-vision-prod-db \
  ancestral-vision-prod-db-recovery \
  --point-in-time "2026-01-11T10:00:00Z"

# Restore from backup (if PITR unavailable)
gcloud sql backups restore $BACKUP_ID \
  --restore-instance=ancestral-vision-prod-db
```

**2. Media Recovery**
```bash
# Restore specific file from version
gsutil cp gs://ancestral-vision-prod-media/users/123/photos/abc.webp#1234567890 \
  gs://ancestral-vision-prod-media/users/123/photos/abc.webp

# Bulk restore from backup bucket
gsutil -m cp -r gs://ancestral-vision-prod-backups/media/2026-01-10/* \
  gs://ancestral-vision-prod-media/
```

**3. Full Environment Recovery**
```bash
# 1. Infrastructure (Terraform)
cd infrastructure/
terraform init
terraform apply -var-file=prod.tfvars

# 2. Database restore
gcloud sql backups restore $BACKUP_ID --restore-instance=ancestral-vision-prod-db

# 3. Deploy application
gcloud run deploy ancestral-vision-api \
  --image us-central1-docker.pkg.dev/$PROJECT/ancestral-vision/api:latest \
  --region us-central1

# 4. DNS update (if needed)
gcloud dns record-sets update ancestralvision.com \
  --type=A --ttl=300 --rrdatas=$NEW_IP
```

### Disaster Recovery Testing

- **Monthly**: Restore database backup to dev environment
- **Quarterly**: Full DR drill with documented runbook
- **Annually**: Cross-region recovery test

---

## Security Operations

### Secret Management

```yaml
# Secret Manager configuration
secrets:
  # Database
  - name: DATABASE_URL
    labels:
      environment: production
      type: database
    replication: automatic

  # Firebase
  - name: FIREBASE_ADMIN_KEY
    labels:
      environment: production
      type: auth

  # AI
  - name: GOOGLE_AI_API_KEY         # For development
    labels:
      environment: development
      type: ai

  # Payments
  - name: LEMONSQUEEZY_API_KEY
    labels:
      environment: production
      type: payments
  - name: LEMONSQUEEZY_WEBHOOK_SECRET
    labels:
      environment: production
      type: payments

  # Email
  - name: RESEND_API_KEY
    labels:
      environment: production
      type: email

# Access control
accessBindings:
  # Cloud Run service account
  - member: serviceAccount:ancestral-vision-api@$PROJECT.iam.gserviceaccount.com
    role: roles/secretmanager.secretAccessor

  # CI/CD service account
  - member: serviceAccount:cloud-build@$PROJECT.iam.gserviceaccount.com
    role: roles/secretmanager.secretAccessor
```

### IAM Roles

| Role | Members | Permissions |
|------|---------|-------------|
| Developer | engineering@ancestralvision.com | View logs, view metrics, deploy to dev, read secrets |
| SRE | sre@ancestralvision.com | All above + deploy to prod, modify infrastructure, write secrets |
| Admin | admin@ancestralvision.com | All above + IAM management, billing, project settings |

### Security Scanning

```yaml
# Cloud Build security scanning
securityScanning:
  # Container vulnerability scanning
  containerScanning:
    enabled: true
    blockOnCritical: true
    blockOnHigh: false          # Alert only

  # Dependency scanning (via npm audit)
  dependencyScanning:
    enabled: true
    failOnHigh: true

  # Secret scanning (via gitleaks)
  secretScanning:
    enabled: true
    preCommitHook: true
```

---

## Cost Management

### Decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q11.10: Monthly cost budget | **Dev: $50, Prod: $500 initial** | Conservative starting budget; scale with revenue; monitor weekly |

### Estimated Costs (Monthly)

| Service | Development | Production (1K users) |
|---------|-------------|----------------------|
| Cloud Run | $0 (free tier) | $100 |
| Cloud SQL | $10 (f1-micro) | $150 |
| Cloud Storage | $5 | $50 |
| Cloud CDN | $0 | $30 |
| Vertex AI | $0 (AI Studio) | $100 |
| Speech-to-Text | $0 | $50 |
| Cloud Logging | $0 (free tier) | $20 |
| **Total** | **~$15** | **~$500** |

### Budget Alerts

```yaml
budgetAlerts:
  production:
    amount: 500
    thresholds:
      - percent: 50
        notificationChannels: [email]
      - percent: 80
        notificationChannels: [email, slack]
      - percent: 100
        notificationChannels: [email, slack, pagerduty]
      - percent: 120
        notificationChannels: [email, slack, pagerduty]
        # Consider auto-scaling limits

  development:
    amount: 50
    thresholds:
      - percent: 80
        notificationChannels: [email]
      - percent: 100
        notificationChannels: [email]
```

### Cost Optimization Checklist

- [ ] Cloud Run min-instances: 1 for prod (avoid cold starts), 0 for dev
- [ ] Cloud SQL: Smallest instance that meets performance needs
- [ ] Storage lifecycle: Move old data to cheaper storage classes
- [ ] AI operations: Enforce user quotas (per 10_security_privacy.md)
- [ ] Reserved capacity: Consider committed use discounts at scale
- [ ] Unused resources: Monthly review of orphaned resources
- [ ] Right-sizing: Quarterly review of instance sizes vs usage

---

## Runbooks

### Incident Response

```markdown
## Incident Template

### Detection
- **Alert triggered**: [alert name]
- **Time detected**: [timestamp UTC]
- **Detected by**: [person/system]
- **Severity**: [P1/P2/P3/P4]

### Impact Assessment
- **Users affected**: [count/percentage]
- **Services affected**: [list]
- **Data impact**: [none/read-only/data loss]

### Response Timeline
| Time | Action | Owner |
|------|--------|-------|
| T+0 | Alert received | System |
| T+5 | Acknowledged | On-call |
| T+10 | Initial assessment | On-call |

### Mitigation Steps
1. [Action taken]
2. [Action taken]

### Resolution
- **Root cause**: [description]
- **Fix applied**: [description]
- **Time to resolution**: [duration]

### Follow-up
- [ ] Post-mortem scheduled (within 48 hours)
- [ ] Action items created in backlog
- [ ] Communication sent to affected users (if applicable)
- [ ] Monitoring/alerting improvements identified
```

### Common Operations

**1. Deploy to Production**
```bash
# Automated via Cloud Build on merge to main
# Manual deploy if needed:
gcloud run deploy ancestral-vision-api \
  --image us-central1-docker.pkg.dev/$PROJECT/ancestral-vision/api:$TAG \
  --region us-central1 \
  --project ancestral-vision-prod
```

**2. Rollback Deployment**
```bash
# List revisions
gcloud run revisions list --service ancestral-vision-api

# Route traffic to previous revision
gcloud run services update-traffic ancestral-vision-api \
  --to-revisions=ancestral-vision-api-00042-abc=100
```

**3. Scale Service**
```bash
# Update max instances
gcloud run services update ancestral-vision-api \
  --max-instances=200

# Update min instances (for traffic spike)
gcloud run services update ancestral-vision-api \
  --min-instances=5
```

**4. Database Migration**
```bash
# Check migration status
npx prisma migrate status

# Run pending migrations
npx prisma migrate deploy

# Rollback (manual - create reverse migration)
npx prisma migrate dev --name rollback_feature_x
```

**5. Rotate Secrets**
```bash
# Add new version
gcloud secrets versions add DATABASE_URL --data-file=new_db_url.txt

# Update Cloud Run to use new version
gcloud run services update ancestral-vision-api

# Disable old version (after verification)
gcloud secrets versions disable DATABASE_URL --version=1
```

**6. Clear CDN Cache**
```bash
# Invalidate specific path
gcloud compute url-maps invalidate-cdn-cache ancestral-vision-lb \
  --path="/static/*"

# Invalidate all
gcloud compute url-maps invalidate-cdn-cache ancestral-vision-lb \
  --path="/*"
```

---

## Launch Checklist

### Pre-Launch (1 week before)

- [ ] All GCP projects provisioned (dev, prod)
- [ ] IAM roles configured
- [ ] Secrets populated in Secret Manager
- [ ] CI/CD pipeline working end-to-end
- [ ] Database migrations tested locally
- [ ] Monitoring dashboards created
- [ ] Alert policies configured
- [ ] Backup/recovery tested
- [ ] Security review completed
- [ ] Load testing completed (target: 100 concurrent users)
- [ ] Runbooks documented
- [ ] On-call rotation established

### Launch Day

- [ ] Final local verification (smoke tests)
- [ ] Database migrations run on production
- [ ] Deploy to production
- [ ] Smoke tests pass on production
- [ ] Monitoring verified (metrics flowing)
- [ ] Alerts verified (test alert)
- [ ] DNS configured (if not done)
- [ ] SSL certificate verified
- [ ] Team on standby (all day)

### Post-Launch (first week)

- [ ] Monitor error rates hourly
- [ ] Monitor performance metrics
- [ ] Review application logs daily
- [ ] Respond to customer feedback
- [ ] Daily standup on launch status
- [ ] Document any issues encountered
- [ ] Celebrate!

---

## Decision Summary

All deployment and operations decisions resolved:

| Category | Key Decisions |
|----------|---------------|
| Environments | Dev + Prod; separate GCP projects |
| Compute | Cloud Run (serverless) |
| Database | Cloud SQL PostgreSQL; start small, scale vertically |
| CDN | Cloud CDN for all static content |
| Deployment | Rolling updates via Cloud Build |
| Observability | Cloud Logging + Monitoring + Error Reporting |
| Scaling | Connection pooling + vertical DB scaling |
| DR Targets | RTO 4 hours, RPO 1 hour |
| Budget | Dev $50, Prod $500 monthly |

---

*Status: Complete - All decisions resolved 2026-01-11*
