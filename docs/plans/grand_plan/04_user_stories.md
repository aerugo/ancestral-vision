# Ancestral Vision: User Stories

> **Status**: COMPLETE

This document defines user stories for Ancestral Vision, organized by persona and feature area.

---

## Personas

### Primary Personas

| Persona | Description | Goals |
|---------|-------------|-------|
| **Explorer Emma** | First-time user curious about family history | Discover, visualize, and understand her ancestry |
| **Archivist Alex** | Dedicated family historian with extensive research | Organize, preserve, and enrich family records |
| **Connector Carlos** | User interested in finding relatives and sharing | Connect with distant family, collaborate on research |
| **Storyteller Sofia** | User focused on preserving family narratives | Record stories, memories, and oral history |

### Secondary Personas

| Persona | Description | Goals |
|---------|-------------|-------|
| **Casual Casey** | Occasional user who dips in and out | Quick updates, view progress, show family |

---

## Epic 1: Onboarding & First Experience

### US-1.1: Account Creation
**As** Explorer Emma
**I want to** create an account quickly
**So that** I can start building my constellation without friction

**Acceptance Criteria:**
- Can sign up with email/password
- Account created in under 30 seconds
- Immediately offered optional guided tour (US-1.2)

---

### US-1.2: Sample Constellation Tour (Optional)
**As** Explorer Emma
**I want to** explore a sample constellation before building my own
**So that** I understand what's possible and feel inspired

**Acceptance Criteria:**
- Offered after account creation: "Would you like a quick tour?"
- Can skip directly to wizard (US-1.3)
- Pre-built sample constellation with rich content (photos, notes, events)
- Guided flythrough with camera movements and highlights
- Tutorial callouts explaining key features:
  - "Each star represents a person in your family"
  - "Brighter stars have richer stories"
  - "Orbiting satellites show life events"
  - "Click to see their profile and timeline"
- Tour duration: ~60-90 seconds
- Ends with: "Ready to build your own?"

---

### US-1.3: First-Run Wizard - Add Yourself
**As** Explorer Emma
**I want to** start my constellation by adding myself
**So that** I have a foundation to build upon

**Acceptance Criteria:**
- Wizard starts with "Let's begin with you"
- Prompted for: name (required), birth date (optional), photo (optional)
- My star appears immediately in the 3D view as I fill in details
- Warm, encouraging tone throughout
- Clear "Next" button to continue to parents

---

### US-1.4: First-Run Wizard - Add Parents
**As** Explorer Emma
**I want to** add my parents as my first relatives
**So that** I can see connections form

**Acceptance Criteria:**
- Wizard prompts: "Now let's add your parents"
- Simple form per parent: name (required), living/deceased, dates (optional)
- Stars appear and connect to mine as each parent is added
- Can mark parent as unknown/skip
- Can add one or both parents
- Option to continue to grandparents or finish wizard

---

### US-1.5: First-Run Wizard - Grandparents (Optional)
**As** Explorer Emma
**I want to** add my grandparents during onboarding
**So that** I can see my constellation take meaningful shape

**Acceptance Criteria:**
- After parents: "Would you like to add grandparents?"
- Can skip to finish wizard
- Shows which grandparents can be added (based on parents entered)
- Simple form per grandparent
- Constellation grows visibly with each addition

---

### US-1.6: Experience the "Aha Moment"
**As** Explorer Emma
**I want to** see my family visualized as a constellation
**So that** I feel emotionally connected and motivated to continue

**Acceptance Criteria:**
- Triggers when wizard completes (minimum: self + 1 parent)
- Camera smoothly pulls back to reveal full constellation
- Stars connected by glowing lines
- Brief pause to let the view sink in
- Warm message: "This is the beginning of your family constellation"
- Clear call to action: "Explore" or "Keep adding family"

---

### US-1.7: Password Reset
**As** any user
**I want to** reset my password if I forget it
**So that** I can regain access to my account

**Acceptance Criteria:**
- "Forgot password?" link on login page
- Enter email to receive reset link
- Reset link expires after 24 hours
- Can set new password from link
- Confirmation message after successful reset
- Email notification that password was changed

---

## Epic 2: Person Management

### US-2.1: Add a Person
**As** Archivist Alex
**I want to** add a new person to my constellation
**So that** I can expand my family tree

**Acceptance Criteria:**
- Can add person from selected person ("Add parent", "Add child", "Add spouse")
- Can add unconnected person and link later (useful when relationship is unclear)
- Required: name only
- Optional: birth date, death date, birthplace, photo
- Person immediately appears in constellation/tree view

---

### US-2.2: Edit Person Details
**As** Archivist Alex
**I want to** edit a person's information
**So that** I can correct or add details as I learn more

**Acceptance Criteria:**
- Select person to open profile panel
- Edit button enables editing mode
- Can modify all fields
- Changes save automatically
- Living/deceased status inferred from death date (has death date = deceased)

---

### US-2.3: Upload Person Photo
**As** Archivist Alex
**I want to** upload a photo for a person
**So that** I can see their face in their profile

**Acceptance Criteria:**
- Drag-and-drop photo onto person profile
- Or click to upload from device
- Automatic cropping/resizing UI
- Photo appears in profile panel (not on 3D star - keeps constellation clean)
- Support for multiple photos (first is primary)

---

### US-2.4: Delete a Person
**As** Archivist Alex
**I want to** remove a person I added incorrectly
**So that** my constellation is accurate

**Acceptance Criteria:**
- Delete option in person profile
- Confirmation dialog explaining impact
- Relationships to deleted person are removed
- Associated content deleted with the person

---

### US-2.5: Manage Relationships
**As** Archivist Alex
**I want to** define and edit relationships between people
**So that** connections are accurately represented

**Acceptance Criteria:**
- Can set parent-child relationships (biological or adoptive)
- Can mark parent-child as "adoptive" relationship
- Can set spouse/partner relationships
- Can set relationship dates (marriage date, divorce date)
- Sibling relationships inferred from shared parents
- Step-relationships inferred from parent's spouse
- Relationships visualized as connecting lines
- Can remove relationships

---

### US-2.6: Switch Between Views
**As** Archivist Alex
**I want to** switch between 3D constellation and traditional tree view
**So that** I can use the best interface for my current task

**Acceptance Criteria:**
- Toggle between "Constellation" (3D) and "Tree" (2D) views
- 3D Constellation: Best for exploration, emotional impact, seeing the big picture
- 2D Tree View: Best for data entry, editing, managing relationships
- Both views show the same data, stay in sync
- User's view preference persists across sessions
- Profile panel works the same in both views

---

## Epic 3: Content & Stories

### US-3.1: Write a Note About Someone
**As** Storyteller Sofia
**I want to** write notes and stories about a person
**So that** their memory is preserved beyond just facts

**Acceptance Criteria:**
- Rich text editor for notes
- Notes appear in person's profile
- Can have multiple notes per person
- Notes contribute to biography weight (star brightness)
- No categories required - freeform content

---

### US-3.2: Upload Audio Memory
**As** Storyteller Sofia
**I want to** upload audio recordings of family stories
**So that** voices and oral traditions are preserved

**Acceptance Criteria:**
- Upload audio file (mp3, m4a, wav)
- Audio player in person's profile
- Can add title and description
- Can associate with one or more people
- Triggers AI transcription flow (US-3.3)

---

### US-3.3: AI Audio Transcription
**As** Storyteller Sofia
**I want to** get AI-powered transcription of my audio recordings
**So that** the content becomes searchable and readable

**Acceptance Criteria:**
- Automatic transcription triggered after audio upload
- Optional settings before transcription:
  - Language (defaults to English, can specify other)
  - Number of speakers (helps with speaker identification)
  - Speaker names (if known, to label speakers)
- Transcription includes:
  - Full text with timestamps
  - Speaker labels (Speaker 1, Speaker 2, or named)
  - Paragraph breaks at natural pauses
- Review interface:
  - Play audio synced with transcript highlighting
  - Click on transcript to jump to that point in audio
  - Edit transcript inline to fix errors
  - Mark sections as "verified" after review
- Transcripts are searchable
- Original audio always preserved

---

### US-3.4: Add Life Events
**As** Archivist Alex
**I want to** add life events to a person's timeline
**So that** their life story is documented chronologically

**Acceptance Criteria:**
- Freeform event title (no predefined types)
- Each event has: title, date, location (optional), description (optional)
- Timeline view in profile shows events chronologically
- Can mark dates as approximate ("circa 1920", "1920s")
- Events visible in both 3D and 2D views (visualization TBD - see Design Notes)

**3D Visualization:**
- Events indicated by satellite(s) orbiting person's star
- NOT 1:1 mapping (one satellite per event) - would be too cluttered
- Satellites indicate presence/richness of timeline content
- Exact satellite behavior TBD (e.g., more satellites = richer timeline, or single satellite that grows)

---

### US-3.5: Create Shared Events
**As** Archivist Alex
**I want to** create events that involve multiple people
**So that** family gatherings and shared experiences are captured

**Acceptance Criteria:**
- Event can link to multiple people
- Example: "Family reunion 1985" linked to 12 people
- Event appears in timeline for all linked people
- Single source of truth (edit once, updates for all)
- Shows "with: [names]" on event display

---

### US-3.6: Upload Documents
**As** Archivist Alex
**I want to** upload documents (birth certificates, letters, etc.)
**So that** primary sources are preserved with the people they relate to

**Acceptance Criteria:**
- Upload PDF, images of documents
- Associate with one or more people
- Add title, date, description
- Documents viewable/downloadable in person profile
- Triggers AI extraction flow (US-3.7)

---

### US-3.7: AI Content Extraction
**As** Archivist Alex
**I want to** automatically extract genealogical data from documents and notes
**So that** I don't have to manually transcribe everything

**Acceptance Criteria:**
- Automatic extraction triggered after document upload
- Manual "Extract data" option available for notes
- AI extracts (based on ancestral-synth extraction approach):
  - Names mentioned (with relationship context: "father", "wife", etc.)
  - Dates (birth, death, marriage, other events)
  - Locations (with as much detail as available)
  - Events described in the content
  - Gender (inferred from context)
- Extraction presented as suggestions, not auto-applied
- Review interface:
  - Shows original content alongside extracted data
  - Each extracted item can be: accepted, rejected, or edited
  - Accepted items create/update people and events
  - Can link extracted people to existing people in tree
- Works on:
  - Typed documents (birth certificates, marriage records)
  - Handwritten documents (letters, diaries) - best effort
  - Photos of documents
  - User-written notes (freeform text)
  - Audio transcripts (after transcription complete)
- Extraction quality indicator (confidence level)

---

### US-3.8: Set Privacy on Content
**As** Storyteller Sofia
**I want to** control who can see my notes and media
**So that** sensitive family information is protected

**Acceptance Criteria:**
- Privacy levels: Private (only me), Connections, Public
- Can set default privacy for new content
- Can override per item
- Visual indicator of privacy level
- Privacy respected in matching/sharing features

---

### US-3.9: Generate Biography from Notes
**As** Storyteller Sofia
**I want to** generate a coherent biography from my scattered notes
**So that** I have a readable life summary

**Acceptance Criteria:**
- "Generate biography" button on person profile
- AI synthesizes all notes, events, dates into narrative
- Can choose tone: formal, storytelling, factual
- Can edit generated biography
- Original notes preserved separately

---

## Epic 4: 3D Constellation Experience

### US-4.1: Navigate the Constellation
**As** Explorer Emma
**I want to** navigate around my 3D constellation
**So that** I can explore my family from different perspectives

**Acceptance Criteria:**
- Mouse/trackpad: drag to rotate, scroll to zoom
- Touch: pinch to zoom, drag to rotate
- Click/tap on star to select person
- Smooth, responsive controls
- Can reset view to default

---

### US-4.2: Focus on a Person
**As** Explorer Emma
**I want to** focus on a specific person
**So that** I can see their details and immediate family

**Acceptance Criteria:**
- Click/tap person to select
- Camera smoothly animates to center on person
- Person's profile panel opens
- Connected people (parents, children, spouse) highlighted
- Others dim slightly

---

### US-4.3: See Biography Weight
**As** Explorer Emma
**I want to** see which ancestors have rich documentation
**So that** I know where I have complete stories and where gaps exist

**Acceptance Criteria:**
- Star brightness correlates to content amount
- Brighter = more notes, events, media
- Dimmer = just basic facts
- Visual legend or tooltip explaining brightness
- Encourages filling in gaps

---

### US-4.4: Generation-Based Layout
**As** Archivist Alex
**I want to** see my constellation with generations visually organized
**So that** I understand the generational structure

**Acceptance Criteria:**
- Force-directed layout with generation layering (current prototype approach)
- Generations arranged in concentric mandala rings
- User (Gen 0) at center
- Ancestors extend outward in rings (Gen -1, -2, etc.)
- Descendants also extend outward (Gen +1, +2, etc.)
- Subtle Y-axis offset creates depth (generations at different heights)
- Generation labels visible on hover or in profile panel

**Implementation Notes:**
- Current prototype already implements this via `ForceDirectedLayout`
- Uses `generationSpacing` config for ring radius
- Maintains natural organic distribution while preserving structure

---

### US-4.5: Experience Theme Modes
**As** Casual Casey
**I want to** switch between light and dark constellation themes
**So that** I can view it comfortably in different environments

**Acceptance Criteria:**
- Dark theme: stars on dark space background (default)
- Light theme: adapted for bright environments
- Toggle easily accessible
- Theme persists across sessions

**Implementation Notes:**
- Theme system must be modular to allow easy addition of future themes
- Themes define: background colors, star colors, line colors, UI colors
- Theme configuration stored separately from component code
- Current prototype has basic theme switching - extend with modular approach

---

## Epic 5: Exploration & Imagination

> This epic contains speculative AI features that help users explore "what might have been" beyond their documented family history. These are opt-in, clearly-labeled imagination features.

### US-5.1: Generate Speculative Ancestors
**As** Explorer Emma
**I want to** see AI-generated speculative ancestors
**So that** I can imagine and explore beyond my documented tree

**Acceptance Criteria:**
- Opt-in feature with clear explanation
- AI generates plausible ancestors based on historical context
- Speculative people visually distinct (different star style)
- Clear "speculative" labels everywhere
- Can promote to "confirmed" if research validates
- Can delete speculative content easily

---

### US-5.2: Generate Speculative Portraits
**As** Explorer Emma
**I want to** see AI-generated portraits for ancestors without photos
**So that** I can visualize what they might have looked like

**Acceptance Criteria:**
- Opt-in feature
- AI generates portrait based on: era, ethnicity, age, family resemblance
- Clear "AI-generated" watermark/label
- Can regenerate with different parameters
- Can replace with real photo if found
- Never generates for living persons

---

## Epic 6: Search & Discovery

### US-6.1: Search My Constellation
**As** Archivist Alex
**I want to** search for people and content in my constellation
**So that** I can quickly find what I'm looking for

**Acceptance Criteria:**
- Search bar prominently placed
- Search by name (fuzzy matching for typos)
- Search by date, location, content
- Results show matching people and content
- Click result to navigate to person

---

### US-6.2: Browse by Surname
**As** Archivist Alex
**I want to** browse my constellation by surname
**So that** I can focus on specific family lines

**Acceptance Criteria:**
- Surname list/filter panel
- Shows count per surname
- Select surname to highlight/filter
- Useful for large constellations

---

## Epic 7: Connections & Collaboration

> This epic enables users to connect with other researchers and share family tree data through manual matching.

### US-7.1: Connect with Another User
**As** Connector Carlos
**I want to** connect with another Ancestral Vision user
**So that** we can share and collaborate on our family research

**Acceptance Criteria:**
- Send connection request by email or username
- Connection is mutual - both users must accept
- Recipient gets notification of request
- Can view pending requests and accept/decline
- Can remove connection later

---

### US-7.2: View Connection's Tree
**As** Connector Carlos
**I want to** browse the people in my connection's tree
**So that** I can find ancestors we might share

**Acceptance Criteria:**
- After connection accepted, can view list of people in their tree
- See basic info: name, dates, relationships
- "Match" button available on each person
- Can search/filter their tree
- Only see people they've made visible (respects privacy settings)

---

### US-7.3: Match a Person Manually
**As** Connector Carlos
**I want to** match a person from my connection's tree to someone in my tree
**So that** we can link our shared ancestry

**Acceptance Criteria:**
- Select person from connection's tree, choose matching person in your tree
- Confirm match with side-by-side comparison
- Once matched, BOTH users gain access to all transitively connected people
- System infers other matches by traversing family relationships
- Only people connected through the match are visible (unconnected branches stay private)
- Either user can propose a match; other user is notified

---

### US-7.4: View Connected People in Constellation
**As** Connector Carlos
**I want to** see matched people from my connection in my constellation
**So that** I can explore our shared ancestry visually

**Acceptance Criteria:**
- Connected people (from match) appear in your constellation
- Visually distinct style indicates "not your own content yet"
- Can navigate to them, view their profile
- See content shared by connection (notes, events)
- Clear indication of who contributed what content

---

### US-7.5: Adopt a Connected Person
**As** Connector Carlos
**I want to** add a connected person to my own tree
**So that** I can contribute my own research about them

**Acceptance Criteria:**
- "Add to my tree" action on connected person
- Done by adding any information (note, event, date correction, etc.)
- Person becomes "yours" while remaining connected
- Visual style changes to indicate you now have your own content
- Your additions visible to your connection as well

---

### US-7.6: Shared Content Sync
**As** Connector Carlos
**I want to** have notes and events shared with my connections
**So that** we both benefit from each other's research

**Acceptance Criteria:**
- Notes and events on matched people are shared and synced
- Both users see all content from both contributors
- Content attributed to contributor
- Person details (name, dates) are NOT auto-synced
- Each user maintains their own version of person metadata
- Prevents conflicts over spelling, date interpretations, etc.

---

### US-7.7: Review Connection Updates (Future)
**As** Connector Carlos
**I want to** review changes my connection made to shared people
**So that** I can choose whether to sync their updates to my tree

**Acceptance Criteria:**
- Notification when connection updates person details
- Review interface showing their changes vs. your version
- Accept individual changes or ignore
- Batch review for multiple updates
- History of sync decisions

**Note:** This is a future feature to handle metadata sync conflicts.

---

## Epic 8: Display & Sharing

### US-8.1: Share Constellation Link
**As** Casual Casey
**I want to** share a link to view my constellation
**So that** family members can see it without an account

**Acceptance Criteria:**
- Generate shareable link
- Link shows read-only view
- Only public content visible
- Can set link expiration
- Can revoke link

---

### US-8.2: Digital Frame Mode
**As** Casual Casey
**I want to** display my constellation on a TV or digital frame
**So that** it becomes ambient art in my home

**Acceptance Criteria:**
- "Frame mode" option in settings
- Full-screen, minimal UI display
- Slow auto-rotation of constellation
- Periodically highlights different people
- Shows name and key dates
- Screensaver-like experience

---

## Epic 9: Settings & Preferences

### US-9.1: Manage Account Settings
**As** any user
**I want to** manage my account settings
**So that** I can control my experience

**Acceptance Criteria:**
- Change email, password
- Manage notification preferences
- View usage/quota information
- Delete account option

---

### US-9.2: Set Default Privacy
**As** Archivist Alex
**I want to** set default privacy for new content
**So that** I don't have to set it each time

**Acceptance Criteria:**
- Default privacy setting in preferences
- Applies to new notes, events, media
- Can always override per item
- Clear explanation of each level

---

## Epic 10: Subscription & Billing

> This epic covers the paid subscription model using LemonSqueezy for payment processing. LemonSqueezy acts as Merchant of Record, handling all tax compliance (EU VAT, US sales tax, etc.).

### US-10.1: View Subscription Plans
**As** Explorer Emma
**I want to** see available subscription plans
**So that** I can understand what features are available at each tier

**Acceptance Criteria:**
- Clear comparison of Free vs Premium tiers
- Feature list for each tier
- Pricing displayed prominently
- "Current plan" indicator for logged-in users
- Easy upgrade path from free tier

---

### US-10.2: Subscribe to Premium Plan
**As** Explorer Emma
**I want to** subscribe to a premium plan
**So that** I can access advanced features

**Acceptance Criteria:**
- LemonSqueezy Checkout integration for secure payment
- Monthly ($9.99/month) and annual ($99/year) billing options
- Annual discount visible ("Save 17% with annual billing")
- Immediate access to premium features after payment
- Confirmation email with receipt

**Implementation Notes:**
- Use LemonSqueezy Checkout for PCI compliance
- LemonSqueezy handles card storage, recurring billing, and all tax compliance
- Webhook integration for subscription events

---

### US-10.3: Manage Subscription
**As** Archivist Alex
**I want to** manage my subscription
**So that** I can update payment or cancel if needed

**Acceptance Criteria:**
- View current plan and billing cycle
- See next billing date and amount
- Update payment method via LemonSqueezy Customer Portal
- View billing history and download invoices
- Cancel subscription (effective at end of billing period)

**Implementation Notes:**
- Use LemonSqueezy Customer Portal for self-service billing management
- Reduces need for custom billing UI

---

### US-10.4: Handle Subscription Changes
**As** the system
**I want to** respond to subscription lifecycle events
**So that** user access is correctly managed

**Acceptance Criteria:**
- Webhook handlers for LemonSqueezy events:
  - `subscription_created` - activate subscription
  - `subscription_updated` - handle plan changes
  - `subscription_payment_failed` - notify user, grace period
  - `subscription_cancelled` - downgrade to free
- Grace period for failed payments (3-7 days)
- Email notifications for payment issues
- Automatic downgrade preserves data (just limits features)

---

### US-10.5: Free Tier Limits
**As** Explorer Emma on free tier
**I want to** understand my usage limits
**So that** I know when I need to upgrade

**Acceptance Criteria:**
- Clear display of limits (e.g., "23 of 50 people added", "5 of 15 AI ops remaining")
- Warning when approaching limits (80% threshold)
- Graceful handling when limit reached (prompt to upgrade, don't lose work)

**Pricing Tiers:**

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

**Rationale:**
- 50 people allows 4+ generations of direct ancestors plus some extended family
- 15 AI ops covers 3-5 document extractions or 1-2 transcriptions per month
- Connections are premium-only (high-value collaboration feature)
- $9.99/month undercuts Ancestry ($20-40/mo) while covering AI costs (~60% margin)
- Annual discount ~17% ($99 vs $120) encourages commitment

---

## Story Map Summary

```
                    ┌─────────────────────────────────────────────────┐
                    │              USER JOURNEY                        │
                    └─────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┬─────────────────────┐
        ▼                     ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ DISCOVER │          │  BUILD  │          │ ENRICH  │          │  SHARE  │
   └─────────┘          └─────────┘          └─────────┘          └─────────┘
        │                     │                     │                     │
   Epic 1: Onboard      Epic 2: People        Epic 3: Content      Epic 7: Connect
   - Sign up            - Add person          - Notes              - Manual matching
   - First stars        - Relationships       - Events             - Shared content
   - Aha moment         - Dual view           - Media              - Collaborate
        │                     │                     │                     │
   Epic 4: Navigate     Epic 6: Search        Epic 5: Imagine      Epic 8: Display
   - 3D controls        - Find people         - Speculative        - Share link
   - Focus/select       - Quick nav             ancestors          - Frame mode
   - Generations        - Surnames            - AI portraits

   ─────────────────────────────────────────────────────────────────────────
   CROSS-CUTTING CONCERNS (applicable throughout journey)
   ─────────────────────────────────────────────────────────────────────────
   Epic 9: Settings          Epic 10: Subscription
   - Account management      - Free tier limits
   - Privacy defaults        - Premium upgrade
                             - Billing management
```

---

## Priority Matrix

### Must Have (MVP)
| Story | Epic | Rationale |
|-------|------|-----------|
| US-1.1 | Onboarding | Can't use without account |
| US-1.3-1.6 | Onboarding | Wizard and aha moment |
| US-1.7 | Onboarding | Password reset is essential |
| US-2.1 | Person | Core functionality |
| US-2.2 | Person | Core functionality |
| US-2.5 | Person | Core functionality |
| US-4.1 | 3D | Core differentiator |
| US-4.2 | 3D | Core interaction |
| US-4.4 | 3D | Generation layout is core visual |
| US-6.1 | Search | Essential for usability |
| US-9.1 | Settings | Account management is essential |

### Should Have (V1.0)
| Story | Epic | Rationale |
|-------|------|-----------|
| US-1.2 | Onboarding | Sample tour enhances onboarding |
| US-2.3 | Person | Visual appeal |
| US-2.4 | Person | Ability to delete |
| US-2.6 | Person | Dual view system |
| US-3.1 | Content | Core content type |
| US-3.4 | Content | Life events timeline |
| US-3.5 | Content | Shared events |
| US-3.6 | Content | Document uploads |
| US-3.7 | Content | AI extraction |
| US-3.8 | Content | Privacy controls |
| US-3.9 | Content | AI biography generation |
| US-4.3 | 3D | Biography weight visual |
| US-4.5 | 3D | Theme modes |
| US-8.1 | Display | Share link |
| US-9.2 | Settings | Default privacy |
| US-10.1-10.5 | Subscription | LemonSqueezy billing & free tier limits |

### Could Have (V1.x)
| Story | Epic | Rationale |
|-------|------|-----------|
| US-3.2 | Content | Audio memories |
| US-3.3 | Content | Audio transcription |
| US-6.2 | Search | Browse by surname |
| US-7.1-7.6 | Connections | Manual matching & collaboration |
| US-8.2 | Display | Frame mode |

### Won't Have (Future)
| Story | Epic | Rationale |
|-------|------|-----------|
| US-5.1 | Imagination | Complex, risky |
| US-5.2 | Imagination | Dependent on US-5.1 |
| US-7.7 | Connections | Metadata sync - future complexity |

---

*Status: Complete*
