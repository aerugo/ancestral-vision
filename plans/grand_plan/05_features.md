# Ancestral Vision: Features Specification

> **Status**: COMPLETE - All decisions documented

This document specifies all features of Ancestral Vision with finalized decisions.

---

## Feature Overview

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 4.1 | 3D Constellation Explorer | Core | Complete |
| 4.2 | Person Profile View | Core | Complete |
| 4.3 | Events System | Core | Complete |
| 4.4 | Notes & Biography System | Core | Complete |
| 4.5 | Media Management | Core | Complete |
| 4.6 | Audio Interview Recording | High | Complete |
| 4.7 | AI-Powered Discovery | High | Complete |
| 4.8 | Speculative Ancestry | Medium | Complete |
| 4.9 | Tree Matching | Medium | Complete |
| 4.10 | Social Features | Medium | Complete |
| 4.11 | Sharing & Display | Medium | Complete |
| 4.12 | Search & Discovery | Core | Complete |
| 4.13 | 2D Tree View | Core | Complete |
| 4.14 | Onboarding Experience | Core | Complete |
| 4.15 | Person Management | Core | Complete |
| 4.16 | Account Settings | Core | Complete |
| 4.17 | Subscription & Billing | Core | Complete |

---

## 4.1 3D Constellation Explorer

### Description
The signature feature - an interactive 3D visualization of the user's family constellation using WebGPU with WebGL fallback.

### Capabilities

**Navigation & Interaction**
- [ ] Free-flight navigation through the constellation
- [ ] Click/tap to select a person (star)
- [ ] Focus highlighting on selection (US-4.2):
  - Connected people (parents, children, spouse) highlighted
  - Non-connected people dim slightly
  - Profile panel opens (see 4.2)
- [ ] Smooth camera animations between selections
- [ ] Reset view to default position

**Visual Representation**
- [ ] Star brightness indicates biography weight (US-4.3)
  - Brighter stars = more notes, events, media
  - Dimmer stars = basic facts only
  - Visual legend/tooltip explaining brightness
- [ ] Satellites indicate richness of content (NOT 1:1 per event - would be too cluttered)
- [ ] Theme support (cosmic dark mode, illuminated manuscript light mode)

**Generation-Based Layout (US-4.4)**
- [ ] Force-directed layout with generation layering
- [ ] Mandala ring arrangement: user (Gen 0) at center
- [ ] Ancestors extend outward in rings (Gen -1, -2, etc.)
- [ ] Descendants also extend outward (Gen +1, +2, etc.)
- [ ] Subtle Y-axis offset creates depth between generations
- [ ] Generation labels visible on hover or in profile panel

**Performance**
- [ ] Performance for 1000+ nodes

### Platform Support
- **Desktop browsers**: Primary platform (Chrome, Firefox, Safari, Edge)
- **iPad browsers**: Full support via Safari/Chrome
- **iOS**: Native companion app (separate codebase)
- **Mobile browsers**: Not supported (companion app planned for future)

### Existing Implementation
The `reference_prototypes/family-constellations/` codebase provides a working prototype with Three.js, custom shaders, force-directed layout, and post-processing effects.

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.1.1: WebGL vs WebGPU | **WebGPU with WebGL fallback** | Future-proof performance while maintaining compatibility |
| Q4.1.2: Touch controls | **Native touch events** | Gesture set: pinch-zoom, pan, rotate, tap-select. iPad browser support only. |
| Q4.1.3: VR/AR support | **Not in scope** | Focus on core experience first |
| Q4.1.4: Frame mode architecture | **Same codebase with mode toggle** | Code reuse, simpler maintenance |
| Q4.1.5: Performance targets | **Desktop: 60fps @ 1000 nodes, iPad: 30fps @ 500 nodes** | Fallback: Reduce particle effects, simplify shaders |
| Q4.1.6: Offline capability | **Not in scope** | Cloud-first approach, future enhancement |
| Q4.1.7: Biography weight calculation | **Weighted score: notes (3), events (2), media (1)** | More weight to rich content; normalized 0-1 scale maps to brightness |
| Q4.1.8: Layout algorithm | **Force-directed with generation constraints** | Uses existing ForceDirectedLayout; generationSpacing config for ring radius |

---

## 4.2 Person Profile View

### Description
Detailed view of an individual person's information.

### Capabilities

**Edit Person Details (US-2.2)**
- [ ] Click to edit person's core details (name, birth date, death date, birthplace)
- [ ] Inline editing with auto-save (2s debounce)
- [ ] Living/deceased status inferred from death date (see Q4.15.4)
- [ ] All fields modifiable

**Profile Tabs & Content**
- [ ] Tabbed interface: Events, Notes, Biography, Match, Photos, Sources
- [ ] Timeline of life events with add functionality
- [ ] Immediate family members panel
- [ ] Notes section for freeform content (US-3.1)
- [ ] AI-generated biography display with regeneration (US-3.9)
- [ ] Privacy controls per item

### Wireframe References
- Wireframes 4-5: Profile layout with tabs
- Wireframe 9: Biography display with links

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.2.1: Profile view presentation | **Slide-in panel** | Maintains 3D context while showing details; can expand to full page on mobile/iPad |
| Q4.2.2: Edit mode approach | **Inline editing (click to edit)** | Modern UX pattern, reduces friction |
| Q4.2.3: Conflicting information | **Show all with source attribution** | Genealogy best practice; user can mark preferred source |
| Q4.2.4: Biography save approach | **Auto-save with debounce (2s)** | Modern UX, prevents data loss |
| Q4.2.5: Rich text editor | **Tiptap** | See tech decision F6 - best React ecosystem support |
| Q4.2.6: Photo gallery | **Grid with modal detail** | Flexible, works well on all screen sizes |

---

## 4.3 Events System

### Description
Track life events for each person with shared event support. Events are freeform - users define their own event types.

### Capabilities
- [ ] Add events to a person's timeline
- [ ] Events can involve multiple people (shared events)
- [ ] AI can suggest events from biography analysis
- [ ] Events become visual satellites in constellation

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.3.1: Event schema | **Freeform events** | No predefined types; users enter event title freely; optional icon selection from preset library |
| Q4.3.2: Date handling precision | **GEDCOM-style flexible dates** | Support: exact (YYYY-MM-DD), partial (YYYY-MM, YYYY), approximate (ABT 1920), ranges (BET 1920 AND 1925), before/after (BEF 1920, AFT 1920). Store as structured object with display formatter. |
| Q4.3.3: Location format | **Structured + geocoded** | Store as structured (place, city, region, country) with optional lat/lng. Use Google Maps Geocoding API (within GCP ecosystem). Free text input with autocomplete. |
| Q4.3.4: Event verification | **Optional source reference** | Sources link to entries in Sources tab; "verified" badge when source attached |
| Q4.3.5: Shared event editing | **Collaborative with history** | Any participant can edit; full edit history preserved; notifications to other participants |

---

## 4.4 Notes & Biography System

### Description
Rich note-taking system with AI integration and sharing controls. Notes are freeform - no predefined categories.

### Capabilities
- [ ] Rich text editing with formatting
- [ ] Privacy levels: Private, Shared with Connections, Public
- [ ] Notes can reference other people
- [ ] AI can analyze notes for extraction
- [ ] Notes contribute to biography weight

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.4.1: Rich text storage format | **Tiptap JSON (ProseMirror)** | Native Tiptap format; easily convertible to HTML/Markdown for export; structured for AI processing |
| Q4.4.2: Maximum note size | **50,000 characters (~10,000 words)** | Generous limit for long-form biography content; prevents abuse while allowing detailed entries |
| Q4.4.3: Note versioning | **Last 10 versions** | Balance between history preservation and storage costs; covers most "undo" needs |
| Q4.4.4: Collaborative editing | **Single editor at a time (locking)** | Simpler implementation; CRDT adds significant complexity for minimal benefit in this use case |
| Q4.4.5: AI biography generation trigger | **On-demand button** | User controls when AI is invoked (counts against quota); "Regenerate" button with option to preserve manual edits |

---

## 4.5 Media Management

### Description
Upload, organize, and associate media with people.

### Media Types
- Photos/Images
- Documents (PDFs, scans)
- Audio recordings

### Capabilities
- [ ] Upload and organize media
- [ ] Associate media with one or more people
- [ ] AI transcription of audio recordings
- [ ] Extract dates/locations from image EXIF
- [ ] Source citation generation

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.5.1: Storage backend | **GCS with signed URLs** | See tech decision I4. Structure: `{bucket}/users/{userId}/media/{type}/{uuid}.{ext}`. CDN via Cloud CDN. Signed URLs for private media (1hr expiry). |
| Q4.5.2: Image handling | **Max 25MB, JPEG/PNG/WebP/HEIC** | Server-side resize to 2048px max dimension; thumbnails at 200px and 800px; WebP conversion for storage efficiency |
| Q4.5.3: Audio format support | **MP3, M4A, WAV, WebM** | Max 2 hours per file; transcode to Opus for storage; original preserved for quality |
| Q4.5.4: Transcription service | **Google Speech-to-Text V2 (Chirp 3)** | See tech decision AI4. All 100+ supported languages; diarization enabled by default. |
| Q4.5.5: Media privacy model | **Independent privacy per item** | Default inherits from person; can override to more restrictive; more flexible for sensitive photos |
| Q4.5.6: Duplicate detection | **Hash-based detection** | SHA-256 hash on upload; warn user of duplicate; allow override for intentional re-use |

---

## 4.6 Audio Interview Recording

### Description
Built-in audio recording for capturing oral histories.

### Capabilities
- [ ] In-browser audio recording
- [ ] Automatic AI transcription
- [ ] Speaker diarization (who said what)
- [ ] Extract names, dates, events from transcription
- [ ] Suggest additions to family tree from interview content

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.6.1: Recording quality | **48kHz, 16-bit, Opus codec** | High quality for voice; Opus provides excellent compression; WebM container for browser compatibility |
| Q4.6.2: Maximum recording duration | **2 hours hard limit** | Chunking: 15-minute segments uploaded progressively to prevent data loss; seamlessly stitched for playback |
| Q4.6.3: Transcription timing | **Post-recording batch** | Simpler UX; Chirp 3 is fast enough (12x real-time); live transcription adds complexity for minimal benefit |
| Q4.6.4: Speaker diarization | **Advanced (multiple speakers)** | Chirp 3 supports up to 6 speakers with identification; user can label speakers post-transcription |
| Q4.6.5: Transcript editing interface | **Time-synced editing** | Click on text to jump to audio position; edit text while listening; speaker labels editable |
| Q4.6.6: Recording privacy | **Cloud processing with consent** | Clear consent modal before first recording; option to delete audio after transcription complete |

---

## 4.7 AI-Powered Discovery

### Description
Gemini-powered analysis to suggest additions and connections.

### Capabilities
- [ ] Analyze notes, biography, transcripts for a person
- [ ] Suggest new people to add (mentioned relatives)
- [ ] Suggest events to add (mentioned life events)
- [ ] Suggest relationships between existing people
- [ ] Suggest corrections to dates/facts
- [ ] Deduplicate suggestions against existing data

### Existing Implementation
`reference_prototypes/ancestral-synth/` provides production-quality agents for biography generation, extraction, correction, and deduplication.

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.7.1: Confidence thresholds | **High >90%, Medium 70-90%, Low <70%** | High: strong evidence from multiple sources; Medium: single clear reference; Low: inference or ambiguous |
| Q4.7.2: User approval workflow | **All suggestions require approval** | Genealogy accuracy is critical; batch approval interface for efficiency; grouped by type (people, events, corrections) |
| Q4.7.3: Processing mode | **On-demand "Discover" button** | Counts against monthly AI quota; user controls when AI runs; shows progress during analysis |
| Q4.7.4: Cost management | **Per-user monthly quotas** | Free: 15 AI operations/month; Premium: 100 AI operations/month (per user stories pricing table) |
| Q4.7.5: Rate limiting | **10 requests/minute, 50/day for Free, 200/day for Premium** | Prevents abuse; Premium gets higher limits; queue system for burst handling |
| Q4.7.6: Suggestion reasoning | **Simple "suggested because..."** | Show source excerpt that triggered suggestion; link to original note/transcript; builds user trust |

---

## 4.8 Speculative Ancestry

### Description
AI-generated plausible ancestors for unknown family history.

### Capabilities
- [ ] Generate speculative ancestors working backwards
- [ ] Use historical context (time, place, social conditions)
- [ ] Generate speculative portraits based on descendant photos
- [ ] Clear visual distinction between known and speculative
- [ ] User can "confirm" speculative entries as known

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.8.1: Generation depth limit | **5 generations max, user-configurable** | Default 3 generations; up to 5 for Premium users; historical accuracy degrades beyond ~150 years |
| Q4.8.2: Historical data sources | **Built-in name/occupation databases** | Use historical name popularity by decade/region; common occupations by era; no external record integration initially (future enhancement) |
| Q4.8.3: Portrait generation | **Google Imagen via Vertex AI** | Style: "historical portrait painting" matching era; blend descendant features; watermark as AI-generated |
| Q4.8.4: Ethical guardrails | **Explicit opt-in, clear disclaimers** | Disclaimer on every speculative person; separate visual treatment (translucent, different border); cultural sensitivity: avoid stereotypes in generated content |
| Q4.8.5: Conversion workflow | **Requires evidence/source** | Cannot simply toggle speculative to confirmed; must attach at least one source document; maintains data integrity |
| Q4.8.6: Speculative in exports | **User choice with default exclude** | GEDCOM export: exclude by default, checkbox to include with SPEC tag; shares: never include speculative data |

---

## 4.9 Tree Matching

### Description
Match people in your tree with the same person in other users' trees.

### Capabilities
- [ ] Search for potential matches based on name, dates, locations
- [ ] View matched person's public/shared information
- [ ] Accept match to link trees
- [ ] Automatic propagation of related matches
- [ ] See notes and events others have shared

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.9.1: Matching algorithm | **Fuzzy matching with scoring** | Weighted factors: name similarity (Levenshtein), birth year (±5 years), birth location, parent names; AI-assisted as enhancement layer for Premium |
| Q4.9.2: Match confidence scoring | **Score 0-100** | Suggestion threshold: 60+; no auto-match (always requires user approval); show confidence breakdown |
| Q4.9.3: Pre-accept visibility | **Name + dates + location** | Limited preview before accepting; full profile visible only after both users accept match |
| Q4.9.4: Match notifications | **In-app + optional email** | In-app notification badge always; email digest weekly (configurable); no push notifications initially |
| Q4.9.5: Unmatching | **Unilateral unmatch allowed** | Either party can break the link; 30-day cool-down before re-matching same person (prevents harassment) |
| Q4.9.6: Match data inheritance | **Manual merge with suggestions** | Show diff of information; user picks what to import; imported data tagged with source user; no automatic sync |

---

## 4.10 Social Features

### Description
Connect with other users and share family history.

### Capabilities
- [ ] Add other users as "Connections"
- [ ] Share notes/events with connections
- [ ] View shared notes on matched people
- [ ] Collaborate on shared ancestors

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.10.1: Connection workflow | **Request + accept** | Request sent via email/link; recipient must accept; builds trust for sharing sensitive family data |
| Q4.10.2: Connection permission levels | **Two tiers: Family and Researcher** | Family: see private-to-connections content; Researcher: see public content only; simpler than granular tiers |
| Q4.10.3: Blocking and privacy | **Block user entirely + hide specific people** | Block: user cannot see any of your data or send requests; Hide: specific people hidden from specific connections |
| Q4.10.4: Shared ancestor collaboration | **Request edit permission** | Default view-only; owner can grant edit permission per-person or per-branch; edit history tracked |
| Q4.10.5: Notification preferences | **Configurable per type** | Types: new connection request, match suggestion, shared content update, collaboration invite. Channels: in-app (always), email (configurable). Default: all on. |
| Q4.10.6: Activity feed | **No activity feed initially** | Focus on direct interactions; activity feeds add complexity and privacy concerns; consider for future |

---

## 4.11 Sharing & Display

### Description
Share your constellation with others and display it as living art.

### Capabilities

**Share Links (US-8.1)**
- [ ] Generate shareable link to constellation
- [ ] Read-only view for recipients (no account required)
- [ ] Only public content visible in shared view
- [ ] Link expiration settings
- [ ] Revoke link at any time

**Digital Frame Mode (US-8.2)**
- [ ] Passive display mode with ambient animation
- [ ] Auto-rotation through the constellation
- [ ] Screensaver-style navigation
- [ ] Cast to TV/display devices
- [ ] Scheduled display times

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.11.1: Share link visibility | **Public content only** | Respects privacy levels; clear to user what's visible |
| Q4.11.2: Link limits | **Free: 1 active link, Premium: unlimited** | Per user stories pricing table |
| Q4.11.3: Casting technology | **Browser tab casting + Chromecast** | Tab casting works everywhere; Chromecast receiver app for optimized experience; AirPlay via browser mirroring |
| Q4.11.4: Animation variety | **Random focus with story option** | Default: slow drift with random focus on different people every 30s; Premium: story-driven tours following lineages |
| Q4.11.5: Information display | **Configurable: name labels default** | Options: pure visual, names only, names + dates, rotating facts. User selects in settings. |
| Q4.11.6: Power/bandwidth optimization | **30fps, simplified shaders, local cache** | Reduced particle effects; disable post-processing on cast devices; cache constellation data locally for 24hr offline |
| Q4.11.7: Target devices | **Smart TVs, digital frames, tablets** | Minimum: 1080p display, WebGL 1.0 support; recommended: 4K, WebGL 2.0; test targets: Chromecast with Google TV, Fire TV, iPad |

---

## 4.12 Search & Discovery

### Description
Find people and content within your constellation quickly.

### Capabilities
- [ ] Global search bar prominently placed (US-6.1)
- [ ] Search by name with fuzzy matching for typos
- [ ] Search by date, location, content
- [ ] Results show matching people and content
- [ ] Click result to navigate to person in constellation
- [ ] Browse/filter by surname (US-6.2)
- [ ] Surname list with counts per surname

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.12.1: Search implementation | **PostgreSQL full-text search** | Per tech decisions - no separate search service needed initially |
| Q4.12.2: Fuzzy matching | **Trigram similarity (pg_trgm)** | Handles typos and name variants; built into PostgreSQL |
| Q4.12.3: Search scope | **People, notes, events, transcripts** | All user content searchable; respects privacy levels |
| Q4.12.4: Results ranking | **Relevance + recency** | Most relevant first; recently accessed/modified boosted |
| Q4.12.5: Surname browser | **Collapsible sidebar panel** | Shows surname list with counts; click to filter constellation view |

---

## 4.13 2D Tree View

### Description
Traditional family tree visualization as an alternative to the 3D constellation. Best suited for data entry, editing, and relationship management (US-2.6).

### Capabilities
- [ ] Toggle between 3D Constellation and 2D Tree views
- [ ] Traditional pedigree/descendant tree layout
- [ ] Same data as 3D view, stays in sync
- [ ] Optimized for data entry and editing
- [ ] Better for managing complex relationships
- [ ] User's view preference persists across sessions
- [ ] Profile panel works identically in both views

### Use Cases
- **3D Constellation**: Exploration, emotional impact, seeing the big picture, showing to family
- **2D Tree View**: Data entry, editing, managing relationships, detailed research work

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.13.1: Tree layout algorithm | **d3-dag with pedigree mode** | Handles complex family structures; supports both ancestor and descendant views |
| Q4.13.2: View switching | **Instant toggle, shared selection** | Selected person stays selected when switching views; camera/scroll position preserved where possible |
| Q4.13.3: Tree rendering | **SVG with virtual scrolling** | Better for large trees; cleaner lines; easier to implement than Canvas |
| Q4.13.4: Mobile/iPad support | **Responsive with horizontal scroll** | Tree expands horizontally; pinch-zoom supported; same touch gestures as constellation |
| Q4.13.5: Default view | **User preference, default 3D** | First-time users see constellation (differentiator); can set preference in settings |

---

## 4.14 Onboarding Experience

### Description
First-run experience that guides new users from account creation through building their first constellation, culminating in an emotional "aha moment."

### Capabilities

**Account Creation (US-1.1)**
- [ ] Sign up with email/password via Firebase Auth
- [ ] Account creation in under 30 seconds
- [ ] Immediately route to tour/wizard choice

**Sample Constellation Tour (US-1.2)**
- [ ] Optional guided tour of sample constellation
- [ ] Pre-built sample with rich content (photos, notes, events)
- [ ] Camera flythrough with automatic movements
- [ ] Tutorial callouts explaining key features:
  - "Each star represents a person in your family"
  - "Brighter stars have richer stories"
  - "Orbiting satellites show life events"
  - "Click to see their profile and timeline"
- [ ] Can skip directly to wizard at any time
- [ ] Tour duration: 60-90 seconds

**First-Run Wizard (US-1.3, US-1.4, US-1.5)**
- [ ] Step 1: Add yourself (name required, birth date and photo optional)
- [ ] Step 2: Add parents (name required each, living/deceased, dates optional)
- [ ] Step 3: Add grandparents (optional, shows which can be added based on parents)
- [ ] Stars appear and connect in real-time as each person is added
- [ ] Can skip parents or grandparents
- [ ] Warm, encouraging tone throughout

**"Aha Moment" (US-1.6)**
- [ ] Triggers when wizard completes (minimum: self + 1 parent)
- [ ] Camera smoothly pulls back to reveal full constellation
- [ ] Stars connected by glowing lines
- [ ] Brief pause (2-3 seconds) to let the view sink in
- [ ] Message: "This is the beginning of your family constellation"
- [ ] Call to action: "Explore" or "Keep adding family"

### Wireframe References
- Wireframes TBD: Tour flow, wizard steps, aha moment

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.14.1: Tour skippability | **Skip available at any time** | Some users want to dive in immediately; never force the tour |
| Q4.14.2: Tour duration | **60-90 seconds, fixed pace** | Long enough to showcase features, short enough to maintain attention |
| Q4.14.3: Sample constellation | **Pre-built, read-only** | 4 generations, ~15 people with realistic content; no user data mixed in |
| Q4.14.4: Wizard minimum | **Self + 1 parent** | Triggers "aha moment"; ensures user sees a connection |
| Q4.14.5: Wizard persistence | **Save progress on each step** | Prevents data loss if browser closes; resume where left off |
| Q4.14.6: Real-time visualization | **Stars animate in during wizard** | Immediate feedback; builds excitement as constellation grows |
| Q4.14.7: "Aha moment" camera | **Pull-back with 2s pause** | Smooth easing animation; dramatic reveal of full constellation |
| Q4.14.8: Re-access tour | **Available in Help menu** | Users can revisit tour anytime; useful for learning features later |
| Q4.14.9: Tutorial callout style | **Floating tooltips with highlight** | Point to relevant element; dismiss on click or auto-advance |
| Q4.14.10: Returning user handling | **Skip onboarding if data exists** | Check for existing people; direct to constellation if already populated |

---

## 4.15 Person Management

### Description
Core CRUD operations for managing people in the constellation: adding, editing, deleting, and managing relationships.

### Capabilities

**Add a Person (US-2.1)**
- [ ] Add person from selected person ("Add parent", "Add child", "Add spouse")
- [ ] Add unconnected person and link later
- [ ] Required: name only
- [ ] Optional: birth date, death date, birthplace, photo
- [ ] Person immediately appears in constellation/tree view

**Delete a Person (US-2.4)**
- [ ] Delete option in person profile
- [ ] Confirmation dialog explaining impact
- [ ] Relationships to deleted person are removed
- [ ] Associated content (notes, events, media) deleted with the person
- [ ] Soft delete with 30-day recovery period

**Manage Relationships (US-2.5)**
- [ ] Set parent-child relationships (biological)
- [ ] Mark parent-child as "adoptive" relationship
- [ ] Set spouse/partner relationships
- [ ] Set relationship dates (marriage date, divorce date)
- [ ] Sibling relationships inferred from shared parents
- [ ] Step-relationships inferred from parent's spouse
- [ ] Relationships visualized as connecting lines
- [ ] Remove relationships

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.15.1: Add person entry points | **Contextual + global** | "Add parent/child/spouse" from selected person; "Add person" button in toolbar for unconnected people |
| Q4.15.2: Deletion model | **Soft delete with 30-day recovery** | Prevents accidental data loss; "Trash" section in settings to restore; permanent delete after 30 days |
| Q4.15.3: Relationship types | **Parent-child, spouse, adoptive** | Core genealogical relationships; sibling/step inferred; no custom relationship types initially |
| Q4.15.4: Living/deceased inference | **Infer from death date** | Has death date = deceased; no explicit toggle needed; reduces data entry friction |
| Q4.15.5: Unconnected people | **Allowed, encouraged to link** | Useful when relationship is unclear; prompt to connect after creation; visual indicator for orphans |
| Q4.15.6: Bulk operations | **Not in initial release** | Focus on individual operations; bulk import via GEDCOM; bulk edit considered for future |

---

## 4.16 Account Settings

### Description
User account management including profile settings, security, notifications, and account deletion.

### Capabilities

**Profile & Security (US-9.1)**
- [ ] Change email address (requires verification)
- [ ] Change password
- [ ] View account creation date
- [ ] View last login date

**Password Reset (US-1.7)**
- [ ] "Forgot password?" link on login page
- [ ] Enter email to receive reset link
- [ ] Reset link expires after 24 hours
- [ ] Can set new password from link
- [ ] Confirmation message after successful reset
- [ ] Email notification that password was changed

**Notification Preferences**
- [ ] Email notifications toggle (global)
- [ ] Per-type notification settings:
  - Connection requests
  - Match suggestions
  - Shared content updates
  - Payment/billing alerts
- [ ] Email digest frequency (immediate, daily, weekly)

**Default Privacy (US-9.2)**
- [ ] Set default privacy level for new content (Private, Connections, Public)
- [ ] Applies to new notes, events, and media
- [ ] Can always override per item when creating/editing
- [ ] Clear explanation of each privacy level

**Usage & Quota (US-10.5 related)**
- [ ] View current plan (Free/Premium)
- [ ] View usage against limits (people count, AI operations, storage)
- [ ] Visual progress bars for quotas
- [ ] Warning when approaching limits (80% threshold)

**Account Deletion**
- [ ] Delete account option with clear warnings
- [ ] Requires password confirmation
- [ ] 14-day grace period before permanent deletion
- [ ] Can cancel deletion during grace period
- [ ] All data permanently removed after grace period

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.16.1: Email change flow | **Verify new email before switch** | Send verification to new address; old email notified of change; prevents account hijacking |
| Q4.16.2: Password requirements | **Min 8 chars, no complexity rules** | Modern security guidance (NIST) recommends length over complexity; Firebase Auth handles this |
| Q4.16.3: Deletion grace period | **14 days** | Balance between user safety and storage costs; can cancel during period; email reminders at 7 and 1 day |
| Q4.16.4: Data export before deletion | **Offer GEDCOM export** | Allow users to take their data before deletion; includes all people, events, notes (excluding media) |
| Q4.16.5: Notification defaults | **All on, email daily digest** | Users can opt down; better engagement default; respects inbox by batching |
| Q4.16.6: Default privacy | **Private** | Conservative default protects user data; easy to share explicitly; aligns with genealogy sensitivity |

---

## 4.17 Subscription & Billing

### Description
Subscription management using LemonSqueezy as Merchant of Record for payment processing and tax compliance.

### Capabilities

**View Plans (US-10.1)**
- [ ] Clear comparison of Free vs Premium tiers
- [ ] Feature list for each tier
- [ ] Pricing displayed prominently ($9.99/month or $99/year)
- [ ] "Current plan" indicator for logged-in users
- [ ] Annual discount visible ("Save 17% with annual billing")

**Subscribe to Premium (US-10.2)**
- [ ] LemonSqueezy Checkout integration
- [ ] Monthly and annual billing options
- [ ] Immediate access to premium features after payment
- [ ] Confirmation email with receipt

**Manage Subscription (US-10.3)**
- [ ] View current plan and billing cycle
- [ ] See next billing date and amount
- [ ] Update payment method via LemonSqueezy Customer Portal
- [ ] View billing history and download invoices
- [ ] Cancel subscription (effective at end of billing period)
- [ ] Reactivate cancelled subscription before period ends

**Handle Subscription Changes (US-10.4)**
- [ ] Webhook handlers for LemonSqueezy events
- [ ] Grace period for failed payments (7 days)
- [ ] Email notifications for payment issues
- [ ] Automatic downgrade preserves data (just limits features)

**Free Tier Limits (US-10.5)**
- [ ] Clear display of limits with progress indicators
- [ ] Warning when approaching limits (80% threshold)
- [ ] Graceful handling when limit reached (prompt to upgrade, don't lose work)
- [ ] Upgrade prompts at natural moments (not intrusive)

### Pricing Tiers

| Feature | Free (Explorer) | Premium ($9.99/mo or $99/yr) |
|---------|-----------------|------------------------------|
| People in tree | 50 | Unlimited |
| AI operations/month | 15 | 100 |
| 3D Constellation | Full | Full |
| Themes | All | All |
| Share links | 1 active | Unlimited |
| Frame Mode | No | Yes |
| Storage | 250 MB | 10 GB |
| Connections | None | Unlimited |
| Priority support | No | Yes |

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q4.17.1: Payment provider | **LemonSqueezy (MoR)** | Handles all tax compliance (EU VAT, US sales tax); see tech decision P1 |
| Q4.17.2: Billing management UI | **LemonSqueezy Customer Portal** | Reduces custom billing UI; users manage payment methods, view invoices via hosted portal |
| Q4.17.3: Failed payment grace | **7 days** | Email at 1, 3, 5 days; downgrade to free after 7 days; can reactivate by updating payment |
| Q4.17.4: Downgrade behavior | **Preserve all data, limit features** | No data deletion on downgrade; excess people become read-only; encourages re-subscription |
| Q4.17.5: Annual discount | **17% (~$99/year vs $120)** | Industry standard discount; encourages commitment; improves cash flow |
| Q4.17.6: Upgrade prompts | **Contextual, not intrusive** | Show when hitting limits or using premium features; never interrupt workflow; dismissable |
| Q4.17.7: Plan change timing | **Immediate upgrade, end-of-period downgrade** | Upgrade: immediate access with prorated charge; Downgrade: access until period ends |

---

## Next Steps

1. ~~Review all open questions with stakeholders~~ ✓
2. ~~Make decisions and document rationale~~ ✓
3. Define data model (08_data_model.md) based on these features
4. Create API specification (09_api_specification.md)
5. Plan Phase 0 implementation scope (12_roadmap.md)

---

*Status: Complete - Last Updated: 2026-01-11*
