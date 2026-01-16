# Genealogy Cleanup - Work Notes

**Status**: Not Started
**Created**: 2026-01-16

## Initial Analysis (2026-01-16)

### Data Summary

| Metric | Value |
|--------|-------|
| Total persons | 119 |
| Complete (with biography) | ~24 |
| Pending/Queued | ~95 |
| Orphaned (not connected) | 37 |
| Duplicate name groups | 25 |
| Child links | 73 |
| Spouse links | 18 |
| Events | ~500+ |
| Notes | ~300+ |

### Critical Issues Found

#### 1. Three-Parent Children

Two children have 3 parents each:

```
Arthur Maxwell (3ca31370-5c1e-45ff-89ee-4ca13d9c445b)
  - Eleanor Harrison (b4c94c9e...) ← GRANDMOTHER, not parent
  - Eleanor Maxwell (da87e415...) ← Mother
  - Edward Maxwell (0e1780e0...) ← Father

Clara Maxwell (8ef316c2-9d6c-46bc-91f9-9e917b49f0c7)
  - Eleanor Harrison (b4c94c9e...) ← GRANDMOTHER, not parent
  - Eleanor Maxwell (da87e415...) ← Mother
  - Edward Maxwell (0e1780e0...) ← Father
```

**Fix**: Remove child_links from Eleanor Harrison to Arthur/Clara Maxwell.

#### 2. Same-Name Analysis (IMPORTANT DISTINCTION)

**Legitimate Different People (named after ancestors):**
These are VALID entries representing different generations:
- Arthur Harrison: 1848, 1905, 1913 (3 generations!)
- William Martin: 1782, 1843, 1875 (3 generations!)
- Thomas Martin: 1795, 1824, 1845 (multiple generations)
- John Martin: 1818, 1869 (father/son)
- Mary Martin: 1823, 1872 (mother/daughter)
- Eleanor Thompson: 1798, 1935 (great-great-grandmother/descendant)

**True Duplicates (same person, merge needed):**
These are erroneous duplicate entries with same birth year:
- Arthur Maxwell: 1912, 1912 → MERGE
- Clara Maxwell: 1909, 1909 → MERGE
- Thomas Harrison: 1883, 1883 → MERGE
- Eleanor Harrison: 1879 x3 → MERGE
- Robert Martin: 1882, 1882 → MERGE
- Clara Martin: 1879, 1879 → MERGE
- Sarah Harrison: 1852, 1852 → MERGE

**Pattern**: AI generated placeholder entries (pending/queued) when
biographies mentioned family members, creating duplicates of real entries.

#### 3. Broken Names

Found: "William ." (45c4319f-b819-40f6-9979-b5f84f29556c) with missing surname.

### Key Persons (Complete with Biographies)

| ID | Name | Role |
|----|------|------|
| 5e46215b-cd77-483c-afee-e3ce86e48509 | Sarah Elizabeth Martin | Central figure |
| b82c03f1-0542-4cea-8e85-6a080877392f | John Martin | Her father |
| 4ba51958-eca7-45ba-9e33-b5ceb958e2d8 | Mary Martin | Her mother |
| 473c7957-098c-4576-9f5f-0486715a4c28 | William Harrison | Her son |
| b4c94c9e-40f9-4fef-aee0-37e5a8b222d8 | Eleanor Harrison | Her daughter |
| 3a7d6912-b1db-48d2-89ef-8d51d507466d | Thomas Harrison | Her son |
| 9dbb775c-1d09-4771-9b8d-1eb8858270aa | William Martin (Sr) | Her grandfather |
| aaee3997-db33-4c95-bb4f-a7f90ff45069 | Eleanor Martin | Her grandmother |
| acef280d-7b85-4290-92a0-c2695ddec6a1 | Thomas Thompson | Maternal grandfather |
| 60a4452d-5291-432f-be81-2797f2eee9a8 | Eleanor Thompson | Maternal grandmother |

---

## Phase Progress

### Phase 1: Structural Audit
- Status: COMPLETED
- Notes: Identified 2 persons with 3 parents, 14 true duplicates, 24 orphans

### Phase 2: Fix 3-parent Issues
- Status: COMPLETED
- Notes: Removed Eleanor Harrison as erroneous parent of Arthur/Clara Maxwell

### Phase 3: Merge Duplicates
- Status: COMPLETED
- Notes: Merged 14 duplicate entries (same birth year, one complete + one pending)

### Phase 4: Remove Orphans
- Status: COMPLETED
- Notes: Removed 24 orphaned persons without biographies

### Phase 5: Complete Missing Data
- Status: COMPLETED
- Notes: Filled birth dates, death dates, locations for 58 persons

### Phase 6: Validation
- Status: COMPLETED
- Notes: All validation checks pass

---

## Final Results (2026-01-16)

| Metric | Before | After |
|--------|--------|-------|
| Total persons | 119 | 81 |
| Complete status | 24 | 81 |
| Child links | 73 | 71 |
| Spouse links | 18 | 18 |
| Persons with >2 parents | 2 | 0 |
| Orphaned persons | 37 | 0 |
| Birth year range | 1782-1943 | 1755-1943 |
| Events | 210 | 210 |
| Notes | 115 | 115 |

### Same-Name Persons (Preserved - Different Generations)

| Name | Birth Years | Generations |
|------|-------------|-------------|
| Arthur Harrison | 1848, 1905, 1913 | 3 |
| William Martin | 1782, 1843, 1875 | 3 |
| Thomas Martin | 1755, 1795, 1824, 1845 | 4 |
| Eleanor Thompson | 1769, 1798, 1935 | 3 |
| John Martin | 1818, 1869 | 2 |
| Mary Martin | 1823, 1872 | 2 |

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-16 | Distinguish same names by birth year | Common practice to name after ancestors |
| 2026-01-16 | Keep persons with biographies, remove empty orphans | Preserve rich content |
| 2026-01-16 | Estimate missing birth dates from relatives | Maintain chronological consistency |

---

## Useful Commands

```bash
# Count by status
jq '[.persons | group_by(.status) | .[] | {status: .[0].status, count: length}]' data/example-genealogy.json

# Find all children of a person
jq --arg id "PERSON_ID" '[.child_links[] | select(.parent_id == $id) | .child_id]' data/example-genealogy.json

# Find parents of a person
jq --arg id "PERSON_ID" '[.child_links[] | select(.child_id == $id) | .parent_id]' data/example-genealogy.json

# Get person by ID
jq --arg id "PERSON_ID" '.persons[] | select(.id == $id)' data/example-genealogy.json
```
