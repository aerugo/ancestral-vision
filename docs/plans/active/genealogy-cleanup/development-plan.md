# Genealogy Data Cleanup - Development Plan

**Status**: In Progress
**Created**: 2026-01-16
**Spec**: [spec.md](spec.md)

## Summary

Systematically clean and consolidate the example genealogy data to create a coherent, consistent, and rich family tree suitable for demonstrating Ancestral Vision.

## Current State Analysis

| Metric | Current Value | Target |
|--------|---------------|--------|
| Total persons | 119 | ~50-70 |
| Complete persons | 24 | ~50-70 |
| Pending/queued | 95 | 0 |
| Orphaned persons | 37 | 0 |
| Persons with 3+ parents | 2 | 0 |
| Duplicate name groups | 25 | 0 (or well-distinguished) |
| Child links | 73 | ~100-150 |
| Spouse links | 18 | ~25-35 |

## Strategy Overview

Rather than attempting to fix every individual issue, we will:

1. **Audit**: Map out the complete current state
2. **Design**: Create a clean, intentional family tree structure
3. **Consolidate**: Merge duplicates and remove orphans
4. **Complete**: Fill in missing data for retained persons
5. **Validate**: Ensure all constraints are satisfied
6. **Verify**: Test visualization with cleaned data

## Phase Overview

| Phase | Description | Key Actions |
|-------|-------------|-------------|
| 1 | Structural Audit | Map all relationships, identify conflicts |
| 2 | Tree Design | Design target family structure |
| 3 | Relationship Fixes | Fix 3-parent issues, consolidate duplicates |
| 4 | Data Completion | Add missing fields to retained persons |
| 5 | Orphan Resolution | Connect or remove orphaned persons |
| 6 | Biography Consistency | Align biographies with structured data |
| 7 | Validation & Testing | Verify data integrity and visualization |

---

## Phase 1: Structural Audit

**Goal**: Create a complete map of the current family tree structure and all issues.

**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. Complete relationship map (who is parent/child/spouse of whom)
2. Conflict report (3+ parents, duplicate IDs, orphans)
3. Data quality report (missing fields by person)
4. Recommendations for consolidation

### Actions

1. Export all persons with their relationships to an analysis format
2. Build a visual family tree to identify structural issues
3. Identify which duplicate names are actually the same person
4. Document which orphans should be connected vs. removed

### Success Criteria

- [ ] All 119 persons catalogued with relationship status
- [ ] All structural conflicts documented
- [ ] Consolidation decisions made for duplicates

---

## Phase 2: Tree Design

**Goal**: Design the target family tree structure with clear generations and relationships.

**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. Target family tree diagram (ASCII or mermaid)
2. Person retention decisions (keep/merge/remove)
3. Relationship corrections list

### Key Decisions

- **Core family**: Martin/Harrison lineage remains central
- **Generations**: Target 6-7 generations for visual depth
- **Branching**: 3-4 distinct family branches for variety
- **Time span**: ~1780-2000 (historically grounded)

### Success Criteria

- [ ] Target tree design documented
- [ ] Each retained person has clear position in tree
- [ ] All relationships are biologically plausible

---

## Phase 3: Relationship Fixes

**Goal**: Fix all structural relationship problems.

**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. Corrected `child_links` array
2. Corrected `spouse_links` array
3. Merged/removed duplicate persons

### Actions

1. Fix Arthur Maxwell and Clara Maxwell parent issues
2. Merge duplicate persons (consolidate IDs)
3. Update all references to merged persons
4. Remove truly orphaned persons

### Success Criteria

- [ ] No person has > 2 parents
- [ ] All child_links reference valid persons
- [ ] All spouse_links reference valid persons
- [ ] Duplicate persons consolidated

---

## Phase 4: Data Completion

**Goal**: Ensure all retained persons have complete basic data.

**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)

### Required Fields

| Field | Required | Notes |
|-------|----------|-------|
| id | ✓ | UUID |
| given_name | ✓ | |
| surname | ✓ | |
| name | ✓ | Full display name |
| gender | ✓ | male/female |
| birth_date | ✓ | YYYY-MM-DD or YYYY |
| birth_place | Recommended | |
| death_date | If deceased | |
| death_place | If deceased | |
| status | ✓ | "complete" for all |

### Actions

1. Audit all retained persons for missing fields
2. Generate plausible dates based on relationships
3. Assign appropriate locations (Ohio-centric)
4. Update all statuses to "complete"

### Success Criteria

- [ ] All persons have required fields
- [ ] All dates are chronologically plausible
- [ ] All statuses are "complete"

---

## Phase 5: Orphan Resolution

**Goal**: Connect or remove all orphaned persons.

**Detailed Plan**: [phases/phase-5.md](phases/phase-5.md)

### Actions

1. Review each orphan against the target tree design
2. Connect orphans that fit logically into the tree
3. Remove orphans that don't have a clear place
4. Update notes and events that reference removed persons

### Success Criteria

- [ ] 0 orphaned persons remaining
- [ ] All persons connect to main tree
- [ ] No dangling references in events/notes

---

## Phase 6: Biography Consistency

**Goal**: Ensure biographies match structured data.

**Detailed Plan**: [phases/phase-6.md](phases/phase-6.md)

### Issues to Address

1. Names in biographies matching person records
2. Dates in biographies matching birth/death dates
3. Relationship descriptions matching child_links/spouse_links
4. Remove references to deleted persons

### Actions

1. For each biography, extract mentioned persons and dates
2. Cross-reference with structured data
3. Update biographies where inconsistencies exist
4. Ensure all mentioned relatives exist in the data

### Success Criteria

- [ ] All names in biographies match person records
- [ ] All dates in biographies match structured data
- [ ] All relationships in biographies match links

---

## Phase 7: Validation & Testing

**Goal**: Verify data integrity and visualization works correctly.

**Detailed Plan**: [phases/phase-7.md](phases/phase-7.md)

### Validation Checks

1. **Schema validation**: All required fields present
2. **Referential integrity**: All IDs in links exist
3. **Biological plausibility**: Parents older than children
4. **Chronological consistency**: Death after birth
5. **Graph connectivity**: All persons connected

### Actions

1. Write/run validation script
2. Load cleaned data in visualization
3. Navigate through family tree
4. Verify person details display correctly

### Success Criteria

- [ ] Validation script passes all checks
- [ ] Visualization loads without errors
- [ ] Navigation works correctly
- [ ] All person data displays properly

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Pending | | | Structural Audit |
| Phase 2 | Pending | | | Tree Design |
| Phase 3 | Pending | | | Relationship Fixes |
| Phase 4 | Pending | | | Data Completion |
| Phase 5 | Pending | | | Orphan Resolution |
| Phase 6 | Pending | | | Biography Consistency |
| Phase 7 | Pending | | | Validation & Testing |

---

## Appendix: Current Issues Detail

### Persons with 3 Parents

```
Child: Arthur Maxwell (3ca31370-5c1e-45ff-89ee-4ca13d9c445b)
Parents:
  1. Eleanor Harrison (b4c94c9e-40f9-4fef-aee0-37e5a8b222d8) - female
  2. Eleanor Maxwell (da87e415-0942-424d-b912-f4fa4e7f4b1f) - female
  3. Edward Maxwell (0e1780e0-61a2-40f1-b34f-615912a0c0c6) - male

Child: Clara Maxwell (8ef316c2-9d6c-46bc-91f9-9e917b49f0c7)
Parents:
  1. Eleanor Harrison (b4c94c9e-40f9-4fef-aee0-37e5a8b222d8) - female
  2. Eleanor Maxwell (da87e415-0942-424d-b912-f4fa4e7f4b1f) - female
  3. Edward Maxwell (0e1780e0-61a2-40f1-b34f-615912a0c0c6) - male
```

**Analysis**: Eleanor Harrison should NOT be a parent of Arthur/Clara Maxwell. She is their grandmother (mother of Eleanor Maxwell). The erroneous links should be removed.

### Same-Name Analysis

**Key Finding**: Many "duplicates" are actually different people named after ancestors (a common genealogical practice). Only merge entries with identical birth years.

**Legitimate Different People (KEEP SEPARATE):**

| Name | Birth Years | Generations |
|------|-------------|-------------|
| Arthur Harrison | 1848, 1905, 1913 | 3 distinct people |
| William Martin | 1782, 1843, 1875 | 3 distinct people |
| Thomas Martin | 1795, 1824, 1845 | 3 distinct people |
| John Martin | 1818, 1869 | 2 distinct people |
| Mary Martin | 1823, 1872 | 2 distinct people |

**True Duplicates (MERGE):**

| Name | Birth Year | Action |
|------|------------|--------|
| Arthur Maxwell | 1912 x2 | Merge pending into complete |
| Clara Maxwell | 1909 x2 | Merge pending into complete |
| Thomas Harrison | 1883 x2 | Merge pending into complete |
| Eleanor Harrison | 1879 x3 | Merge 2 pending into complete |
| Robert Martin | 1882 x2 | Merge (both incomplete) |
| Clara Martin | 1879 x2 | Merge (both incomplete) |
| Sarah Harrison | 1852 x2 | Merge (both incomplete) |
