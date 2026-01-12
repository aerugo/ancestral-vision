# Ancestral Vision: Core Concepts

This document defines the foundational concepts and mental models that shape Ancestral Vision.

---

## 1. The Constellation Metaphor

The central metaphor reframes genealogy from a "tree" to a "constellation":

| Tree Terminology | Constellation Terminology |
|-----------------|---------------------------|
| Family Tree | Family Constellation |
| Person/Node | Planet / Celestial Body |
| Branches | Orbital paths / Connections |
| Roots | Ancestral orbits |
| Leaves | Descendant bodies |

### Visual Hierarchy

- **The User** is at the center of their constellation
- **Generations** extend outward in orbital rings (ancestors inward/upward, descendants outward/downward)
- **Biography richness** determines star brightness (more content = brighter glow)
- **Events** indicated by satellites orbiting each star (not 1:1 - satellites represent timeline richness)
- **Connections** are rendered as flowing energy lines between bodies

### Why Constellation Over Tree?

1. **Non-hierarchical feel**: Trees imply a root and leaves; constellations feel more egalitarian
2. **3D native**: Trees are inherently 2D; constellations are naturally 3D
3. **Emotional resonance**: Stars evoke wonder, permanence, navigation
4. **Growth metaphor**: Constellations can expand infinitely in all directions

---

## 2. Gamification Model

The constellation "grows" and becomes more beautiful as users engage:

| User Action | Constellation Effect |
|-------------|---------------------|
| Add a new person | New star appears in constellation |
| Write biography/notes | Star glows brighter |
| Add life events | Timeline grows richer |
| Upload photos | Photo gallery populates |
| Upload audio | Audio archive grows |
| Connect with others | Golden bridges form between constellations |
| Confirm speculative ancestor | Ghost becomes solid planet |

### Biography Weight

A core metric that drives visual prominence (see Q4.1.7):

```
biography_weight = (notes × 3) + (events × 2) + (media × 1)
```

Normalized to 0-1 scale, then mapped to star brightness:
- **Brighter stars** = more notes, events, media
- **Dimmer stars** = basic facts only
- Visual legend/tooltip explains brightness to users

---

## 3. Data Model Concepts

### Person (Planet)

The central entity representing an individual in the family.

**Identity**:
- Name (given, surname, maiden, nickname)
- Gender
- Birth date/place
- Death date/place

**Content**:
- Biography (narrative life story)
- Notes (freeform annotations)
- Events (freeform life milestones)
- Media (photos, documents, audio)
- Sources (citations)

**Relationships**:
- Parents
- Children
- Spouses
- Siblings (inferred)

**Speculative Flag**:
- `speculative: false` (default): User-entered data
- `speculative: true`: AI-generated, unverified (see 4.8 Speculative Ancestry)

### Events

Life events that document a person's timeline.

**Properties**:
- Title (freeform - no predefined types)
- Date (exact, approximate, or range)
- Location (optional)
- Description (optional)
- Participants (for shared events)

**Shared Events**: Events involving multiple people (marriages, family gatherings) appear in all participants' timelines.

**3D Visualization**: Events are indicated by satellites orbiting the person's star. Note: NOT a 1:1 mapping (one satellite per event) - satellites represent the presence/richness of timeline content, not individual events.

### Notes

Freeform annotations that enrich a person's story.

**Properties**:
- Content (rich text)
- Privacy level
- Referenced people (optional)

Notes contribute to biography weight - the more notes, the brighter the star.

### Media (Artifacts)

Photos, documents, and recordings associated with people.

**Types**:
- Photos/Images
- Documents (PDFs, scans)
- Audio recordings

**Properties**:
- File reference
- Caption/description
- Date taken/recorded
- People depicted
- Transcription (for audio)

### Relationships

**Primary Relationships** (stored explicitly):
- Parent-child links
- Spouse links

**Inferred Relationships** (computed):
- Siblings (shared parents)
- Half-siblings (one shared parent)
- Grandparents/grandchildren
- Aunts/uncles, nieces/nephews
- Cousins

---

## 4. Speculation Framework

Ancestral Vision embraces the unknown through transparent speculation.

### Knowledge Levels

**Known** (default): User-entered or verified information
- Displayed as solid, fully-rendered stars
- Can be cited with sources

**Speculative**: AI-generated plausible ancestors (see 4.8)
- Based on historical context (time, place, social conditions)
- Based on known relatives' information
- Displayed with ghost-like/translucent rendering
- Clearly marked as speculative everywhere
- Can be "confirmed" by attaching source evidence

### Speculation Generation

The AI can generate speculative ancestors by:

1. **Working backwards**: If we know a person, their parents must have existed
2. **Historical context**: What was life like in that time/place?
3. **Demographic statistics**: Common names, occupations, lifespans
4. **Known relative inference**: Siblings, spouses, children inform parent characteristics

### Speculation Ethics

- **Transparency**: Always clearly mark speculative content
- **No false confidence**: Never present speculation as fact
- **User control**: Users choose whether to enable speculation
- **Reversibility**: Speculative content can be hidden or deleted
- **Cultural sensitivity**: Respect historical sensitivities

---

## 5. Privacy Model

### Data Ownership

- Users own their data
- Export available in standard formats
- Deletion is permanent and complete

### Visibility Levels

For each piece of content (notes, events, media):

| Level | Visibility |
|-------|------------|
| Private | Only the creator |
| Connections | Creator and their connections |
| Public | Anyone viewing matched profiles |

### Matching Privacy

When trees are matched:
- Only public/connection-shared content is visible
- Private content is never exposed
- Users can limit what's shared with matches

---

## 6. Glossary

| Term | Definition |
|------|------------|
| **Constellation** | A user's complete family network visualized in 3D |
| **Star** | A person represented as a celestial body |
| **Satellite** | Orbiting element indicating timeline/event richness (not 1:1 with events) |
| **Biography Weight** | Metric of information richness for a person (affects star brightness) |
| **Speculative** | AI-generated content marked as unverified |
| **Match** | Link between same person in different users' constellations |
| **Connection** | Social relationship between users (not family members) |
| **Generation** | Distance from the centered user (0 = user, -1 = parents, +1 = children) |

---

*Status: Complete*
