# Phase 6: Biography Consistency

**Goal**: Ensure biographies match structured data.

## Overview

The rich biographies in the data may contain information that conflicts with the structured fields (dates, relationships, names). This phase reconciles them.

## Common Issues

1. **Name mismatches**: Biography mentions "John Martin" but structured data says "John William Martin"
2. **Date conflicts**: Biography says "born in 1852" but birth_date field is "1853-10-12"
3. **Relationship errors**: Biography mentions "son Arthur" but no such child in child_links
4. **References to removed persons**: Biography mentions someone we deleted as a duplicate

## Approach

### Option A: Update Biographies (Preferred)
Modify biography text to match the canonical structured data.

### Option B: Update Structured Data
If the biography has more detailed/accurate information, update the structured fields.

### Option C: Flag Discrepancies
For complex cases, add a note field documenting the discrepancy.

## Task List

### 6.1 Extract Biography Facts

For each complete biography, extract:
- All names mentioned
- All dates mentioned
- All relationships stated
- All locations mentioned

### 6.2 Cross-Reference with Structured Data

Compare extracted facts against:
- person.name, person.given_name, person.surname
- person.birth_date, person.death_date
- child_links and spouse_links
- person.birth_place, person.death_place

### 6.3 Resolve Conflicts

For each conflict:
1. Determine which source is more authoritative
2. Update the less authoritative source
3. Ensure consistency

### 6.4 Remove References to Deleted Persons

If a biography mentions someone who was removed:
- Remove or generalize the reference
- Or add the person back if they should exist

## Example Fixes

### Date Conflict
```
Biography: "born on October 12, 1852"
Structured: birth_date: "1853-10-12"

Resolution: Update birth_date to "1852-10-12" (biography is more specific)
```

### Name Mismatch
```
Biography: mentions "her husband James Harrison"
Structured: spouse is "Arthur Harrison"

Resolution: This is an error - update biography to say "Arthur Harrison"
```

### Missing Person
```
Biography: mentions "son Thomas" with details
Structured: no Thomas in child_links

Resolution: Either add Thomas to the data or remove from biography
```

## Validation

- [ ] All names in biographies match person records
- [ ] All dates in biographies match structured fields (±1 year tolerance)
- [ ] All stated relationships match link data
- [ ] No references to non-existent persons

## Success Criteria

- [ ] Biographies and structured data are consistent
- [ ] No references to deleted persons
- [ ] Key facts are preserved
