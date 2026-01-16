# Phase 3: Relationship Fixes

**Goal**: Fix all structural relationship problems in the genealogy data.

## Overview

This phase implements the relationship corrections identified in Phases 1-2. The changes are made directly to `data/example-genealogy.json`.

## Critical Fixes

### 3.1 Fix 3-Parent Issues

**Problem**: Arthur Maxwell and Clara Maxwell each have 3 parents.

**Root Cause**: Eleanor Harrison (b4c94c9e-40f9-4fef-aee0-37e5a8b222d8) is incorrectly linked as a parent when she is actually the grandmother.

**Fix**: Remove erroneous child_links:

```json
// REMOVE these links from child_links array:
{
  "parent_id": "b4c94c9e-40f9-4fef-aee0-37e5a8b222d8",  // Eleanor Harrison
  "child_id": "3ca31370-5c1e-45ff-89ee-4ca13d9c445b"   // Arthur Maxwell
}
{
  "parent_id": "b4c94c9e-40f9-4fef-aee0-37e5a8b222d8",  // Eleanor Harrison
  "child_id": "8ef316c2-9d6c-46bc-91f9-9e917b49f0c7"   // Clara Maxwell
}
```

**Verification**:
```bash
# Before: should return 2 results
jq '[.child_links[] | select(.parent_id == "b4c94c9e-40f9-4fef-aee0-37e5a8b222d8" and (.child_id == "3ca31370-5c1e-45ff-89ee-4ca13d9c445b" or .child_id == "8ef316c2-9d6c-46bc-91f9-9e917b49f0c7"))]' data/example-genealogy.json

# After: should return empty array
```

### 3.2 Consolidate Duplicate Persons

For each merge, we need to:
1. Keep one person record (the most complete one)
2. Update all child_links referencing the removed ID
3. Update all spouse_links referencing the removed ID
4. Update all events referencing the removed ID
5. Update all notes referencing the removed ID
6. Remove the duplicate person record

#### Example Merge: John Martin

```
IDs to merge:
- b82c03f1-0542-4cea-8e85-6a080877392f (KEEP - complete biography)
- 02837231-6067-4d3e-903d-db6e3f616144 (MERGE INTO ABOVE - queued status)

Steps:
1. Find all references to 02837231...
2. Replace with b82c03f1...
3. Delete person 02837231... from persons array
```

**Merge Script Template**:
```bash
# Replace references to OLD_ID with NEW_ID
jq --arg old "OLD_ID" --arg new "NEW_ID" '
  .child_links |= map(
    if .parent_id == $old then .parent_id = $new else . end |
    if .child_id == $old then .child_id = $new else . end
  ) |
  .spouse_links |= map(
    if .person1_id == $old then .person1_id = $new else . end |
    if .person2_id == $old then .person2_id = $new else . end
  ) |
  .events |= map(
    if .primary_person_id == $old then .primary_person_id = $new else . end
  ) |
  .notes |= map(
    if .person_id == $old then .person_id = $new else . end
  ) |
  .persons |= map(select(.id != $old))
' data/example-genealogy.json
```

### 3.3 Add Missing Spouse Links

Ensure all parent pairs are linked as spouses:

| Parent 1 | Parent 2 | Status |
|----------|----------|--------|
| John Martin | Mary Martin | EXISTS |
| Arthur Harrison | Sarah Elizabeth Martin | CHECK |
| William Harrison | Clara Miller | CHECK |
| ... | ... | ... |

**Add Missing Links**:
```json
// Add to spouse_links if missing:
{
  "person1_id": "1be6a372-8133-409e-813a-914cb6cf7d46",  // Arthur Harrison
  "person2_id": "5e46215b-cd77-483c-afee-e3ce86e48509"   // Sarah Elizabeth Martin
}
```

### 3.4 Add Missing Parent Links

Ensure all persons have appropriate parent links:

```bash
# Find persons with only 1 parent
jq '[.child_links | group_by(.child_id) | .[] | select(length == 1) | .[0].child_id]' data/example-genealogy.json
```

For each single-parent child, either:
- Add the missing parent link (if parent exists)
- Create a new person record for the missing parent
- Document as intentional (e.g., unknown parent)

## Task Checklist

### 3.1 Three-Parent Fixes
- [ ] Remove Eleanor Harrison → Arthur Maxwell link
- [ ] Remove Eleanor Harrison → Clara Maxwell link
- [ ] Verify both children now have exactly 2 parents

### 3.2 Duplicate Merges
Merge each duplicate group (from Phase 1 analysis):

- [ ] John Martin: Merge queued/pending into complete
- [ ] Mary Martin: Merge duplicates
- [ ] William Martin: Distinguish by generation, merge true duplicates
- [ ] Thomas Martin: Distinguish by generation, merge true duplicates
- [ ] Eleanor Thompson: Distinguish by generation, merge true duplicates
- [ ] Eleanor Harrison: Merge true duplicates
- [ ] Eleanor Martin: Merge true duplicates
- [ ] Eleanor Hayes: Merge true duplicates
- [ ] Arthur Harrison: Merge true duplicates
- [ ] Arthur Hayes: Merge true duplicates
- [ ] Samuel Martin: Merge true duplicates
- [ ] Sarah Martin: Merge true duplicates
- [ ] Margaret Martin: Merge true duplicates
- [ ] Martha Martin: Merge true duplicates
- [ ] Clara Miller: Merge true duplicates
- [ ] Clara Maxwell: Merge true duplicates
- [ ] Arthur Maxwell: Merge true duplicates
- [ ] Thomas Harrison: Merge true duplicates
- [ ] William Harrison: Merge true duplicates
- [ ] Sarah Harrison: Merge true duplicates
- [ ] Thomas Thompson: Merge true duplicates
- [ ] Robert Martin: Merge true duplicates
- [ ] Clara Martin: Merge true duplicates
- [ ] Arthur Martin: Merge true duplicates
- [ ] Elizabeth Martin: Merge true duplicates

### 3.3 Spouse Links
- [ ] Audit all parent pairs
- [ ] Add missing spouse links
- [ ] Remove orphaned spouse links

### 3.4 Parent Links
- [ ] Find children with 0-1 parents
- [ ] Add missing parent links or document as intentional

## Validation

After all fixes:

```bash
# No person has more than 2 parents
jq '[.child_links | group_by(.child_id) | .[] | select(length > 2)] | length' data/example-genealogy.json
# Expected: 0

# All child_links reference existing persons
jq '
  [.persons[].id] as $ids |
  [.child_links[] | select(
    (.parent_id as $p | $ids | index($p) | not) or
    (.child_id as $c | $ids | index($c) | not)
  )]' data/example-genealogy.json
# Expected: []

# All spouse_links reference existing persons
jq '
  [.persons[].id] as $ids |
  [.spouse_links[] | select(
    (.person1_id as $p | $ids | index($p) | not) or
    (.person2_id as $p | $ids | index($p) | not)
  )]' data/example-genealogy.json
# Expected: []
```

## Success Criteria

- [ ] 0 persons with > 2 parents
- [ ] All duplicate groups resolved
- [ ] All child_links valid
- [ ] All spouse_links valid
- [ ] All parent pairs have spouse links
