# Genealogy Data Cleanup - Specification

**Status**: Active
**Created**: 2026-01-16
**Purpose**: Clean up and make the example genealogy data consistent and coherent for demo purposes

## Problem Statement

The `data/example-genealogy.json` file contains a fictional genealogy dataset intended for demonstrating Ancestral Vision. However, the data has accumulated several inconsistencies that make it confusing and unrealistic:

### Issues Identified

#### 1. Children with More Than 2 Parents (Critical)
Two children have 3 parents each, which is genealogically impossible:
- **Arthur Maxwell** has parents: Eleanor Harrison, Eleanor Maxwell, Edward Maxwell
- **Clara Maxwell** has parents: Eleanor Harrison, Eleanor Maxwell, Edward Maxwell

#### 2. Same Names - Two Distinct Issues

**A. Legitimate Same Names (Different People)** - These are VALID and should be KEPT:
Many families name children after ancestors. These are distinct people:

| Name | Birth Years | Relationship |
|------|-------------|--------------|
| Arthur Harrison | 1848, 1905, 1913 | Grandfather → Father → Son |
| William Martin | 1782, 1843, 1875 | Great-grandfather → Grandfather → Father |
| Thomas Martin | 1795, 1824, 1845 | Multiple generations |
| John Martin | 1818, 1869 | Father → Son |
| Mary Martin | 1823, 1872 | Mother → Daughter |
| Eleanor Thompson | 1798, 1935 | Great-great-grandmother → Descendant |

**B. True Duplicates (Same Person, Multiple Entries)** - These should be MERGED:
Placeholder entries created during data generation that duplicate real persons:

| Name | Birth Years | Evidence |
|------|-------------|----------|
| Arthur Maxwell | 1912, 1912 | Same year, one complete + one pending |
| Clara Maxwell | 1909, 1909 | Same year, one complete + one pending |
| Thomas Harrison | 1883, 1883 | Same year, one complete + one pending |
| Eleanor Harrison | 1879, 1879, 1879 | Same year, one complete + two pending |
| Robert Martin | 1882, 1882 | Same year, both incomplete |
| Clara Martin | 1879, 1879 | Same year, both incomplete |
| Sarah Harrison | 1852, 1852 | Same year, both incomplete |

#### 3. Incomplete Persons (95 persons)
The majority of persons have `status: "pending"` or `status: "queued"` with minimal data:
- Missing birth/death dates
- Missing biographies
- Missing locations
- Some have obviously broken names (e.g., "William ." with missing surname)

#### 4. Orphaned Persons (37 persons)
37 of 119 persons are not connected to the family tree through any child_links or spouse_links.

#### 5. Data Inconsistencies
- Biographies may reference incorrect relationships
- Birth/death dates may conflict with stated relationships
- Some spouses are not properly linked

## Goals

1. **Structural Integrity**: Every person has exactly 0 or 2 parents (never 1, never 3+)
2. **Unique Identification**: Each person has a distinguishing name or can be clearly identified
3. **Complete Core Data**: All persons have at minimum: name, birth_date, gender
4. **Connected Tree**: All persons connect to the main family tree
5. **Biographical Consistency**: Biographies match the structured data
6. **Rich Demo Experience**: Maintain enough variety and depth for compelling demos

## Constraints

- This is fictional data for demo purposes - historical accuracy is not required
- The data should remain plausible (reasonable dates, locations, relationships)
- Keep the core family structure centered on the Martin/Harrison families
- Preserve the existing rich biographies where possible
- Target approximately 50-70 well-defined persons rather than 119 incomplete ones

## Success Criteria

- [ ] No person has more than 2 parents
- [ ] No duplicate person IDs
- [ ] Every person has name, gender, birth_date
- [ ] Every person connects to the family tree
- [ ] Biographies are consistent with structured data
- [ ] Data validates against the expected schema
- [ ] Visualization renders correctly with cleaned data
