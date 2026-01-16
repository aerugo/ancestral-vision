# Phase 7: Validation & Testing

**Goal**: Verify data integrity and ensure visualization works correctly.

## Overview

Final validation to ensure the cleaned data is correct and works properly in Ancestral Vision.

## Validation Checks

### 7.1 Schema Validation

All required fields present:
```bash
# Check for missing required fields
jq '[.persons[] | select(
  .id == null or
  .name == null or
  .given_name == null or
  .surname == null or
  .gender == null or
  .birth_date == null or
  .status == null
) | .name]' data/example-genealogy.json
# Expected: []
```

### 7.2 Referential Integrity

All IDs in links exist:
```bash
# All parent_ids exist
jq '
  [.persons[].id] as $ids |
  [.child_links[].parent_id | select(. as $id | $ids | index($id) | not)]
' data/example-genealogy.json
# Expected: []

# All child_ids exist
jq '
  [.persons[].id] as $ids |
  [.child_links[].child_id | select(. as $id | $ids | index($id) | not)]
' data/example-genealogy.json
# Expected: []

# All spouse IDs exist
jq '
  [.persons[].id] as $ids |
  [.spouse_links[] | select(
    (.person1_id as $id | $ids | index($id) | not) or
    (.person2_id as $id | $ids | index($id) | not)
  )]
' data/example-genealogy.json
# Expected: []
```

### 7.3 Biological Plausibility

Parents are older than children:
```bash
# This requires parsing dates, best done in a validation script
# Check that parent birth_year < child birth_year for all parent-child pairs
```

### 7.4 Chronological Consistency

Death after birth:
```bash
# Deaths are after births (where both exist)
jq '[.persons[] | select(.birth_date != null and .death_date != null) |
  select(.birth_date > .death_date) | {name, birth_date, death_date}]
' data/example-genealogy.json
# Expected: []
```

### 7.5 Graph Connectivity

All persons connected to main tree:
```bash
# Already checked in Phase 5 - 0 orphans
```

### 7.6 Parent Count Validation

Every person has 0 or 2 parents (never 1 or 3+):
```bash
# Exactly 0 or 2 parents per person
jq '
  [.child_links | group_by(.child_id) | .[] |
   select(length != 2 and length != 0) |
   {child_id: .[0].child_id, parent_count: length}]
' data/example-genealogy.json
# Note: Root ancestors will have 0 parents, this is expected
```

## Visualization Testing

### 7.7 Load Data in Application

1. Start development server: `npm run dev`
2. Navigate to constellation view
3. Verify data loads without console errors

### 7.8 Navigation Testing

Test navigating the family tree:
- [ ] Click on persons to center view
- [ ] Verify parent connections render correctly
- [ ] Verify child connections render correctly
- [ ] Verify spouse connections render correctly

### 7.9 Person Details

Test person detail panel:
- [ ] All fields display correctly
- [ ] Biography renders properly
- [ ] Dates format correctly
- [ ] Locations display properly

### 7.10 Search/Filter (if implemented)

- [ ] Search finds persons by name
- [ ] Generation filter works
- [ ] Date range filter works

## Final Statistics

Document final data state:

```bash
echo "=== Final Genealogy Statistics ==="
echo -n "Total persons: "
jq '.persons | length' data/example-genealogy.json

echo -n "Complete persons: "
jq '[.persons[] | select(.status == "complete")] | length' data/example-genealogy.json

echo -n "Child links: "
jq '.child_links | length' data/example-genealogy.json

echo -n "Spouse links: "
jq '.spouse_links | length' data/example-genealogy.json

echo -n "Events: "
jq '.events | length' data/example-genealogy.json

echo -n "Notes: "
jq '.notes | length' data/example-genealogy.json

echo -n "Orphans: "
jq '
  [.persons[].id] as $all |
  ([.child_links[].parent_id] + [.child_links[].child_id] +
   [.spouse_links[].person1_id] + [.spouse_links[].person2_id]) | unique as $linked |
  [$all[] | select(. as $id | $linked | index($id) | not)] | length
' data/example-genealogy.json

echo -n "Persons with >2 parents: "
jq '[.child_links | group_by(.child_id) | .[] | select(length > 2)] | length' data/example-genealogy.json
```

## Success Criteria

- [ ] All validation scripts pass
- [ ] Visualization loads without errors
- [ ] Navigation works correctly
- [ ] All person data displays properly
- [ ] Final statistics documented

## Completion Checklist

- [ ] All 7 phases completed
- [ ] Final data committed
- [ ] Plan moved to completed folder
- [ ] Release notes written (if applicable)
