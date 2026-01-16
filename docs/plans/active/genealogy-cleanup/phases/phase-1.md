# Phase 1: Structural Audit

**Goal**: Create a complete map of the current family tree structure and all issues.

## Overview

Before making any changes, we need a complete understanding of the current data state. This phase produces analysis artifacts that will guide all subsequent phases.

## Tasks

### 1.1 Export Relationship Analysis

Create a script or use jq queries to extract:

```bash
# Get all persons with their parent counts
cat data/example-genealogy.json | jq '
  [.child_links | group_by(.child_id) | .[] |
   {child_id: .[0].child_id, parent_count: length}] |
  group_by(.parent_count) |
  map({parent_count: .[0].parent_count, count: length})'

# Get children with exactly 3 parents (the problem cases)
cat data/example-genealogy.json | jq '
  [.child_links | group_by(.child_id) | .[] |
   select(length == 3) |
   {child_id: .[0].child_id, parents: [.[].parent_id]}]'
```

### 1.2 Build Person Relationship Map

For each person, determine:
- Parent IDs (from child_links where they are the child)
- Child IDs (from child_links where they are the parent)
- Spouse IDs (from spouse_links)
- Generation (relative to center person)

Output format:
```json
{
  "person_id": "xxx",
  "name": "John Martin",
  "parents": ["id1", "id2"],
  "children": ["id3", "id4"],
  "spouses": ["id5"],
  "generation": -1,
  "status": "complete|pending|queued"
}
```

### 1.3 Identify Duplicate Persons to Merge

For each duplicate name group, determine if they are:
- **Same person** (merge): Same generation, same parents, similar dates
- **Different persons** (keep separate): Different generations or families
- **Unclear** (needs investigation): Conflicting information

Create a merge decision table:

| Name | ID 1 | ID 2 | Decision | Rationale |
|------|------|------|----------|-----------|
| John Martin | b82c... | 02837... | MERGE | Same person, duplicate entry |
| John Martin | b82c... | d9a7c... | KEEP | Different generations |
| ... | ... | ... | ... | ... |

### 1.4 Identify Orphan Disposition

For each of the 37 orphaned persons:
- Can they logically fit in the tree?
- Should they become a spouse/parent/child of an existing person?
- Should they be removed entirely?

| Orphan ID | Name | Recommended Action | Connect To |
|-----------|------|-------------------|------------|
| xxx | John Doe | REMOVE | N/A |
| yyy | Jane Smith | CONNECT | Person ID as spouse |
| ... | ... | ... | ... |

### 1.5 Assess Data Quality by Person

For each person (especially the 24 complete ones), verify:
- [ ] Has valid birth date
- [ ] Has valid birth place
- [ ] Has death date if born before 1940
- [ ] Has gender
- [ ] Has biography (for complete persons)
- [ ] Generation is set

Create quality score:
- **A**: All fields complete
- **B**: Missing 1-2 optional fields
- **C**: Missing required fields
- **D**: Major issues (wrong parents, etc.)

## Deliverables

1. **`analysis/relationship-map.json`**: Full relationship data for all persons
2. **`analysis/duplicate-decisions.md`**: Merge/keep decisions for duplicates
3. **`analysis/orphan-decisions.md`**: Connect/remove decisions for orphans
4. **`analysis/quality-report.md`**: Data quality scores by person

## Success Criteria

- [ ] All 119 persons analyzed
- [ ] Merge decisions made for all 25 duplicate groups
- [ ] Disposition decided for all 37 orphans
- [ ] Quality scores assigned to all persons
- [ ] 3-parent issue root cause understood

## Commands for Analysis

```bash
# Total persons
jq '.persons | length' data/example-genealogy.json

# Persons by status
jq '[.persons | group_by(.status) | .[] | {status: .[0].status, count: length}]' data/example-genealogy.json

# Find all child links for a specific child
jq --arg id "CHILD_ID" '[.child_links[] | select(.child_id == $id)]' data/example-genealogy.json

# Find all spouse links for a specific person
jq --arg id "PERSON_ID" '[.spouse_links[] | select(.person1_id == $id or .person2_id == $id)]' data/example-genealogy.json

# Find orphaned persons (not in any link)
jq '
  [.persons[].id] as $all |
  ([.child_links[].parent_id] + [.child_links[].child_id] +
   [.spouse_links[].person1_id] + [.spouse_links[].person2_id]) | unique as $linked |
  [$all[] | select(. as $id | $linked | index($id) | not)]' data/example-genealogy.json
```

## Notes

- The 3-parent issue appears to be Eleanor Harrison erroneously linked as parent when she's actually the grandmother
- Many duplicate names are likely the same person entered multiple times during data generation
- Most pending/queued persons were probably created as placeholders during biography generation
