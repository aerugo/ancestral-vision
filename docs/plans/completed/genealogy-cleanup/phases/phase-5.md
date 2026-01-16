# Phase 5: Orphan Resolution

**Goal**: Connect or remove all orphaned persons (37 currently identified).

## Overview

After duplicate merging, some persons may still be disconnected from the main family tree. These need to be either connected or removed.

## Current Orphans

Run to get current orphan list:
```bash
jq '
  [.persons[].id] as $all |
  ([.child_links[].parent_id] + [.child_links[].child_id] +
   [.spouse_links[].person1_id] + [.spouse_links[].person2_id]) | unique as $linked |
  [.persons[] | select(.id as $id | $linked | index($id) | not) | {id, name, status}]
' data/example-genealogy.json
```

## Decision Framework

For each orphan, determine:

### Option 1: Connect as Parent
- Can this person be a parent of an existing person?
- Add to child_links

### Option 2: Connect as Child
- Can this person be a child of an existing couple?
- Add to child_links

### Option 3: Connect as Spouse
- Can this person be a spouse of an existing person?
- Add to spouse_links

### Option 4: Remove
- Person has no logical place in the tree
- Remove from persons array
- Remove any events/notes referencing them

## Task List

1. Export current orphan list
2. For each orphan, research their context (names, dates, any biography text)
3. Make connect/remove decision
4. Implement connections or removals
5. Update related events and notes

## Cleanup Script Template

```bash
# Remove orphan and all references
jq --arg id "ORPHAN_ID" '
  .persons |= map(select(.id != $id)) |
  .child_links |= map(select(.parent_id != $id and .child_id != $id)) |
  .spouse_links |= map(select(.person1_id != $id and .person2_id != $id)) |
  .events |= map(select(.primary_person_id != $id)) |
  .notes |= map(select(.person_id != $id))
' data/example-genealogy.json
```

## Validation

```bash
# No orphans remain
jq '
  [.persons[].id] as $all |
  ([.child_links[].parent_id] + [.child_links[].child_id] +
   [.spouse_links[].person1_id] + [.spouse_links[].person2_id]) | unique as $linked |
  [$all[] | select(. as $id | $linked | index($id) | not)] | length
' data/example-genealogy.json
# Expected: 0
```

## Success Criteria

- [ ] 0 orphaned persons
- [ ] All connections are biologically plausible
- [ ] No dangling references in events/notes
