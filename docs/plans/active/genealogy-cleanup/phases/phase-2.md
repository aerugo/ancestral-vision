# Phase 2: Tree Design

**Goal**: Design the target family tree structure with clear generations and relationships.

## Overview

Based on the Phase 1 audit, design a clean, coherent family tree. This becomes the blueprint for all cleanup work.

## Target Structure

### Core Family Lines

The genealogy centers on the **Martin** and **Harrison** families, with connections through marriage.

```
                         GENERATION -3 (~1780s births)
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
William Martin ═ Eleanor Hayes    Thomas Thompson ═ Eleanor Davies
(1782-1858)     (1792-1862)       (1796-1865)      (1798-1885)
    │                                   │
    │                         ┌─────────┴─────────┐
    │                         │                   │
    │                    Mary Thompson      (other Thompson children)
    │                    (1823-1901)
    │                         │
    │           GENERATION -1 (~1820s births)
    │                         │
    └────────┬────────────────┘
             │
      John Martin ═ Mary Thompson
      (1818-?)       (née Thompson)
             │
             │
    ┌────────┼────────┬────────┬────────┬────────┐
    │        │        │        │        │        │
William  Thomas  Samuel  Martha  Sarah Elizabeth
Martin   Martin  Martin  Martin  Martin
(1843-)  (1845-) (1850-) (1851-) (1852-1935)
                                     │
                                     │
                    GENERATION 0 (centered person)
                                     │
                          Sarah Elizabeth ═ Arthur Harrison
                          Martin            (1848-?)
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
             William Harrison  Eleanor Harrison  Thomas Harrison
             (1876-1952)       (1879-1963)       (1883-1968)
                    │                │
                    │         ┌──────┴──────┐
                    │         │             │
                    │   Clara Maxwell  Arthur Maxwell
                    │   (1909-)        (1912-2001)
                    │
             GENERATION +1 (children of core siblings)
```

### Design Principles

1. **6-7 generations**: From ~1780 to ~2000
2. **Ohio-centric**: Most events in Ohio (Preble, Belmont, Washington counties)
3. **Realistic family sizes**: 3-5 children per couple typical
4. **Marriage patterns**: Marriage ages 18-30 typical for the era
5. **Lifespan patterns**: 60-85 years typical, with some early deaths

## Person Retention Decisions

### Tier 1: Keep (Essential)
Persons with complete biographies and central to the family story:
- Sarah Elizabeth Martin (5e46215b...) - Central figure
- John Martin (b82c03f1...) - Her father
- Mary Martin (4ba51958...) - Her mother
- William Harrison (473c7957...) - Her son
- Eleanor Harrison (b4c94c9e...) - Her daughter
- Thomas Harrison (3a7d6912...) - Her son
- William Martin senior (9dbb775c...) - Her grandfather
- Eleanor Martin née Hayes (aaee3997...) - Her grandmother
- Thomas Thompson (acef280d...) - Her maternal grandfather
- Eleanor Thompson (60a4452d...) - Her maternal grandmother

### Tier 2: Keep with Completion
Persons with partial data but necessary for family structure:
- Arthur Harrison (1be6a372...) - Husband of Sarah Elizabeth
- Arthur Maxwell (3ca31370...) - Grandson
- Clara Maxwell (8ef316c2...) - Granddaughter
- (Spouses of Tier 1 children)

### Tier 3: Merge
Duplicate persons to consolidate:
- Multiple "John Martin" → Keep 1-2 distinct
- Multiple "Eleanor Thompson" → Keep 1-2 distinct
- Multiple "William Martin" → Keep distinct by generation

### Tier 4: Remove
Orphaned or truly extraneous persons:
- Persons not connected to any family line
- Placeholder entries with minimal data
- Duplicate entries after merging

## Relationship Corrections

### 3-Parent Fix

```
CURRENT (WRONG):
Arthur Maxwell has parents:
  - Eleanor Harrison (grandmother)
  - Eleanor Maxwell (mother)
  - Edward Maxwell (father)

CORRECTED:
Arthur Maxwell has parents:
  - Eleanor Maxwell (mother)
  - Edward Maxwell (father)

Eleanor Harrison is grandparent (via Eleanor Maxwell)
```

Same correction applies to Clara Maxwell.

### Spouse Link Additions

Ensure all couples with children are linked as spouses:
- William Martin (1843) ═ Amelia Davies
- Samuel Martin ═ Eleanor Hayes
- Thomas Martin ═ (wife TBD)
- Martha Martin ═ (husband TBD)
- Eleanor Maxwell ═ Edward Maxwell

## Generation Assignment

| Generation | Description | Birth Years |
|------------|-------------|-------------|
| -3 | Great-great-grandparents | 1780-1810 |
| -2 | Great-grandparents | 1790-1830 |
| -1 | Grandparents | 1815-1860 |
| 0 | Parents (Sarah Elizabeth's gen) | 1845-1890 |
| +1 | Children | 1875-1920 |
| +2 | Grandchildren | 1900-1950 |
| +3 | Great-grandchildren | 1930-1980 |

## Deliverables

1. **Target tree diagram** (ASCII or mermaid format)
2. **Person retention list** with decisions
3. **Merge mapping** (old IDs → retained ID)
4. **New relationship links** to add

## Success Criteria

- [ ] Clear tree structure documented
- [ ] Every retained person has defined place
- [ ] Merge decisions finalized
- [ ] Relationship fixes specified
