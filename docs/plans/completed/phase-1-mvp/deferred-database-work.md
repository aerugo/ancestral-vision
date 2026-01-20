# Deferred Database Work

**Created**: 2026-01-13
**Purpose**: Document all database-related tasks that are deferred until production database access is available

---

## Overview

During Phase 1 MVP development, database tests are skipped using `isDatabaseAvailable()` pattern since no database is available in the development environment. This document tracks all database work that must be completed before production deployment.

---

## 1. Initial Prisma Migration

### Status: Required

The Prisma schema (`prisma/schema.prisma`) is complete but no migrations have been generated. This must be done first when database access is available.

```bash
# Generate initial migration from existing schema
npx prisma migrate dev --name init

# Verify migration
npx prisma migrate status
```

### Tables to Create (from schema.prisma)

| Model | Purpose |
|-------|---------|
| User | Firebase authenticated users |
| UsageTracking | AI operations and storage limits |
| OnboardingProgress | User onboarding state |
| Constellation | User's family tree container |
| Person | Family members |
| ParentChildRelationship | Parent-child links |
| SpouseRelationship | Marriage/partnership links |
| Event | Life events (birth, marriage, etc.) |
| EventParticipant | People involved in events |
| Note | Biographical notes with version history |
| Media | Photos, documents, audio files |
| MediaPerson | Links between media and people |
| Source | Citations and references |
| ShareLink | Public sharing tokens |
| Connection | Inter-user connections |
| Match | Potential person matches |

---

## 2. Search Extension and Indexes (Phase 1.7)

### Status: Required for optimal search performance

The search resolver includes a fallback to ILIKE when pg_trgm is not available, but for production performance the extension and indexes are essential.

### Migration File

Create `prisma/migrations/XXXXXX_add_search_indexes/migration.sql`:

```sql
-- =============================================================================
-- pg_trgm Extension for Fuzzy Search (Phase 1.7)
-- =============================================================================

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for trigram search on Person name fields
CREATE INDEX IF NOT EXISTS person_given_name_trgm_idx
  ON "Person" USING GIN ("givenName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS person_surname_trgm_idx
  ON "Person" USING GIN ("surname" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS person_display_name_trgm_idx
  ON "Person" USING GIN ("displayName" gin_trgm_ops);
```

### Verification

After applying migration, verify pg_trgm is working:

```sql
-- Test similarity function
SELECT similarity('John', 'Jonh');  -- Should return ~0.5

-- Test trigram operator
SELECT 'John Smith' % 'Jon Smyth';  -- Should return true
```

### Code Impact

- File: `src/graphql/resolvers/search-resolvers.ts`
- Current behavior: Falls back to ILIKE if pg_trgm not available
- After migration: Will use pg_trgm for fuzzy matching with similarity scores

---

## 3. Performance Indexes (from Grand Plan)

### Status: Recommended for production performance

These indexes are documented in `docs/plans/grand_plan/08_data_model.md` and should be added for optimal query performance.

### Migration File

Create `prisma/migrations/XXXXXX_add_performance_indexes/migration.sql`:

```sql
-- =============================================================================
-- Performance Indexes (from Grand Plan 08_data_model.md)
-- =============================================================================

-- Person lookups (supplements existing Prisma indexes)
-- Note: Some of these may already exist from Prisma schema @@index directives

-- Full-text search on notes content
CREATE INDEX IF NOT EXISTS idx_note_content_fts
  ON "Note" USING gin (to_tsvector('english', content));

-- Soft delete filtering (fast lookup for non-deleted records)
CREATE INDEX IF NOT EXISTS idx_person_active
  ON "Person" ("constellationId") WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_active
  ON "Event" ("constellationId") WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_note_active
  ON "Note" ("personId") WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_active
  ON "Media" ("constellationId") WHERE "deletedAt" IS NULL;

-- Match lookups
CREATE INDEX IF NOT EXISTS idx_match_users
  ON "Match" ("user1Id", "user2Id");

CREATE INDEX IF NOT EXISTS idx_match_status
  ON "Match" ("status") WHERE status = 'SUGGESTED';
```

---

## 4. Existing Prisma Schema Indexes

These indexes are already defined in `prisma/schema.prisma` and will be created by Prisma migrate:

| Model | Index | Fields |
|-------|-------|--------|
| Person | @@index | constellationId |
| Person | @@index | constellationId, deletedAt |
| ParentChildRelationship | @@index | childId |
| ParentChildRelationship | @@index | childId, isPreferred |
| SpouseRelationship | @@index | person1Id |
| SpouseRelationship | @@index | person2Id |
| Event | @@index | primaryPersonId |
| Event | @@index | constellationId |
| Note | @@index | personId |
| Media | @@index | constellationId |
| ShareLink | @@index | constellationId, isActive |

---

## 5. Resolver Tests to Verify

Once database is available, these test files should run without skipping:

| Test File | Tests | Notes |
|-----------|-------|-------|
| `src/graphql/resolvers/index.test.ts` | 19 | Core CRUD operations |
| `src/graphql/resolvers/relationship.test.ts` | 23 | Parent-child and spouse |
| `src/graphql/resolvers/note.test.ts` | 15 | Notes with version history |
| `src/graphql/resolvers/event.test.ts` | 18 | Events with participants |
| `src/graphql/resolvers/media.test.ts` | 18 | Media upload/management |
| `src/graphql/resolvers/search.test.ts` | 13 | Fuzzy search with pg_trgm |
| `src/lib/prisma.test.ts` | 13 | Schema validation |
| `src/lib/auth.test.ts` | 4 | User creation/retrieval |
| `prisma/seed.test.ts` | 9 | Seed data verification |

**Total**: 132 tests currently skipped due to database unavailability

---

## 6. Seed Data

The seed script at `prisma/seed.ts` creates test data for development. Run after migrations:

```bash
# Run seed script
npx prisma db seed

# Verify seed data
npx prisma studio
```

### Seed Data Created

- Test user (Firebase UID: test-user-uid)
- Test constellation with 4 people (Alex Smith + parents + grandmother)
- Sample relationships between people

---

## 7. Production Deployment Checklist

### Pre-Deployment

- [ ] PostgreSQL instance provisioned (Cloud SQL recommended)
- [ ] DATABASE_URL environment variable configured
- [ ] Database user created with appropriate permissions
- [ ] Connection pooling configured (PgBouncer or similar)

### Migration Execution

```bash
# 1. Check migration status
npx prisma migrate status

# 2. Run all pending migrations
npx prisma migrate deploy

# 3. Verify pg_trgm extension
psql -c "SELECT * FROM pg_extension WHERE extname = 'pg_trgm';"

# 4. Verify indexes created
psql -c "\di" | grep -E "(trgm|fts|active)"

# 5. Run seed script (if needed for initial data)
npx prisma db seed
```

### Post-Deployment Verification

```bash
# Run full test suite with database
DATABASE_URL="..." npm test

# Verify all 132 previously-skipped tests now pass
npm test -- --run | grep -E "(passed|failed)"
```

---

## 8. Rollback Procedures

### If Migration Fails

```bash
# Check which migrations are applied
npx prisma migrate status

# Rollback manually (create reverse migration)
npx prisma migrate dev --name rollback_description
```

### Emergency Extension Removal

```sql
-- If pg_trgm causes issues, remove it (search will fallback to ILIKE)
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
```

---

## 9. Future Database Considerations

### Phase 2+ Features (not yet implemented)

- Full-text search on notes (when note search is added)
- Geographic indexes for location data (when map features are added)
- Materialized views for ancestry traversal (when pedigree charts are added)

### Performance Monitoring

After production deployment, monitor:
- Query execution times (Cloud SQL Insights)
- Index usage (pg_stat_user_indexes)
- pg_trgm similarity search performance

---

*Document will be updated as additional database requirements are identified during development.*
