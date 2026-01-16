# Phase 4: Data Completion

**Goal**: Ensure all retained persons have complete basic data.

## Overview

After removing duplicates and orphans, fill in missing data for all remaining persons.

## Required Fields

| Field | Status | Validation |
|-------|--------|------------|
| id | Required | Valid UUID |
| given_name | Required | Non-empty string |
| surname | Required | Non-empty string |
| name | Required | Full display name |
| gender | Required | "male" or "female" |
| birth_date | Required | YYYY-MM-DD or YYYY |
| birth_place | Recommended | Location string |
| death_date | If deceased | YYYY-MM-DD or YYYY |
| death_place | If deceased | Location string |
| maiden_name | If applicable | Original surname for married women |
| status | Required | Must be "complete" |

## Data Generation Guidelines

### Birth Dates

Calculate based on relationships:
- A person should be born 20-35 years after their parents
- Siblings should be born 1-5 years apart
- First child typically born 1-3 years after marriage

```
Parent birth + 25 years ≈ Child birth (average)
```

### Death Dates

- If born before 1940, person is deceased
- Average lifespan: 65-80 years for this era
- Some variance for early deaths (disease, accidents)

### Locations

Use Ohio locations consistent with the family:
- **Preble County**: Martin family base
- **Belmont County**: William Martin Sr. origin
- **Washington County (Marietta)**: Thompson family origin
- **Clark County (Springfield)**: Sarah Elizabeth later life
- **Dayton**: Thomas Harrison later life

### Names

Fix incomplete names like "William ." :
- Research context from relationships
- Assign appropriate surname based on family

## Task List

### 4.1 Audit Missing Fields

```bash
# Find persons missing birth_date
jq '[.persons[] | select(.birth_date == null) | {id, name}]' data/example-genealogy.json

# Find persons missing gender
jq '[.persons[] | select(.gender == null) | {id, name}]' data/example-genealogy.json

# Find persons with broken names
jq '[.persons[] | select(.surname == "." or .surname == null) | {id, name, surname}]' data/example-genealogy.json
```

### 4.2 Generate Missing Dates

For each person without dates:
1. Find their parents' birth dates
2. Find their children's birth dates
3. Calculate a plausible birth year
4. Assign death date if applicable

Example calculation:
```
Person X has:
- Parent born 1820
- Child born 1875
- Therefore X born ~1845-1855
```

### 4.3 Assign Locations

Default locations by family:
- Martin family: "Preble County, Ohio"
- Thompson family: "Marietta, Washington County, Ohio"
- Harrison family: "Gratis Township, Preble County, Ohio"

### 4.4 Fix Broken Names

Person "William ." (45c4319f-b819-40f6-9979-b5f84f29556c):
- Check who this person is related to
- Assign appropriate surname
- Update all name fields

### 4.5 Update Status

Set all retained persons to `status: "complete"`:

```bash
jq '.persons |= map(.status = "complete")' data/example-genealogy.json
```

## Validation

```bash
# All persons have birth_date
jq '[.persons[] | select(.birth_date == null)] | length' data/example-genealogy.json
# Expected: 0

# All persons have gender
jq '[.persons[] | select(.gender == null)] | length' data/example-genealogy.json
# Expected: 0

# All persons have complete status
jq '[.persons[] | select(.status != "complete")] | length' data/example-genealogy.json
# Expected: 0

# No broken surnames
jq '[.persons[] | select(.surname == "." or .surname == null or .surname == "")] | length' data/example-genealogy.json
# Expected: 0
```

## Success Criteria

- [ ] All persons have id, name, given_name, surname, gender, birth_date
- [ ] All dates are chronologically plausible
- [ ] All locations are geographically consistent
- [ ] All statuses are "complete"
- [ ] No broken or incomplete names
