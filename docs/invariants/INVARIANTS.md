# Ancestral Vision - Architectural Invariants

> **Purpose**: This document captures architectural constraints and rules that must be maintained across the codebase. Violating these invariants will break the application.

---

## Data Model Invariants (INV-D)

### INV-D001: Entity IDs are UUID v4

All entity IDs (Person, Constellation, Event, Note, Media, etc.) are globally unique UUID v4 strings.

```typescript
// Correct
const person = { id: 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5', ... }

// Incorrect - sequential IDs
const person = { id: 1, ... }
```

**Rationale**: UUIDs enable distributed ID generation without coordination and support future cross-constellation matching.

### INV-D002: User IDs are Firebase UIDs

User IDs are Firebase-generated strings (not UUID). They come from Firebase Auth and must not be modified.

```typescript
// Correct - Firebase UID format
const user = { id: 'AbCdEfGhIjKlMnOpQrStUvWxYz123456', ... }

// Incorrect - UUID for users
const user = { id: 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5', ... }
```

**Rationale**: Firebase Auth provides the user identity. We store the Firebase UID as our primary key.

### INV-D003: Every Person belongs to exactly one Constellation

A Person cannot exist without a Constellation. A Person cannot belong to multiple Constellations.

```prisma
model Person {
  constellationId String
  constellation   Constellation @relation(fields: [constellationId], references: [id])
  // No nullable constellationId
}
```

**Rationale**: Constellation is the ownership boundary. Cross-constellation people are handled via Matches.

### INV-D004: One Constellation per User

Each User has at most one Constellation. This is enforced by a unique constraint on `ownerId`.

```prisma
model Constellation {
  ownerId String @unique
  owner   User   @relation(fields: [ownerId], references: [id])
}
```

**Rationale**: Simplifies ownership model. Multiple trees are handled via Connections, not multiple Constellations.

### INV-D005: Soft Delete with 30-Day Recovery

Deleted Persons are not removed from the database. They are marked with `deletedAt` and `deletedBy` timestamps. Hard deletion occurs after 30 days.

```typescript
// Correct - soft delete
await prisma.person.update({
  where: { id },
  data: { deletedAt: new Date(), deletedBy: userId }
});

// Incorrect - hard delete
await prisma.person.delete({ where: { id } });
```

**Rationale**: Prevents accidental data loss. Users can recover deleted people within 30 days.

---

## Security Invariants (INV-S)

### INV-S001: All GraphQL Mutations Require Authentication

Every mutation resolver must verify the user is authenticated before performing any database operation.

```typescript
// Correct
const user = requireAuth(context);
// Now safe to proceed

// Incorrect - no auth check
async function createPerson(_, args, context) {
  return prisma.person.create({ ... }); // DANGEROUS
}
```

**Rationale**: Prevents unauthorized data modification.

### INV-S002: Users Can Only Access Their Own Constellation

Queries and mutations must filter by the authenticated user's constellation. Never expose data from other users' constellations.

```typescript
// Correct
const constellation = await prisma.constellation.findUnique({
  where: { ownerId: context.user.id }
});

// Incorrect - arbitrary constellation access
const constellation = await prisma.constellation.findUnique({
  where: { id: args.constellationId } // User could pass any ID
});
```

**Rationale**: Multi-tenant data isolation. Each user's data is completely separate.

### INV-S003: Firebase Admin SDK is Server-Only

`firebase-admin` must never be imported in client-side code. Use `firebase` (client SDK) for browser authentication.

```typescript
// Server-side only (API routes, server components)
import { getFirebaseAdmin } from '@/lib/firebase-admin';

// Client-side only (client components, hooks)
import { auth, signInWithEmailAndPassword } from '@/lib/firebase';
```

**Rationale**: Admin SDK credentials expose full database/auth control. Client-side exposure is a critical security vulnerability.

---

## Architecture Invariants (INV-A)

### INV-A001: WebGPURenderer Must Be Initialized with `await renderer.init()`

Unlike WebGLRenderer, WebGPURenderer requires async initialization before use.

```typescript
// Correct
const renderer = new WebGPURenderer();
await renderer.init();
renderer.setAnimationLoop(animate);

// Incorrect - missing init()
const renderer = new WebGPURenderer();
renderer.setAnimationLoop(animate); // Will fail
```

**Rationale**: WebGPU adapter/device acquisition is asynchronous. Rendering before init causes errors.

### INV-A002: Use `renderer.setAnimationLoop()` not `requestAnimationFrame()`

Three.js r171+ WebGPU requires the renderer's animation loop, not manual RAF.

```typescript
// Correct
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// Incorrect
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

**Rationale**: WebGPU rendering is promise-based. `setAnimationLoop` handles this correctly.

### INV-A003: Three.js Version r171+

WebGPU support requires Three.js r171 or later. The TSL (Three Shading Language) imports are version-specific.

```json
{
  "dependencies": {
    "three": "^0.171.0"
  }
}
```

**Rationale**: Earlier versions lack stable WebGPU support.

### INV-A004: WebGPU Imports from `three/webgpu`

WebGPU-specific classes must be imported from the webgpu submodule.

```typescript
// Correct
import { WebGPURenderer } from 'three/webgpu';

// Incorrect - standard Three.js import
import { WebGPURenderer } from 'three'; // Not exported here
```

**Rationale**: WebGPU classes are in a separate build path.

### INV-A005: TanStack Query for Server State

All server data fetching must use TanStack Query hooks. Never use raw `fetch()` or `useEffect` for API calls.

```typescript
// Correct
const { data, isLoading } = useConstellation();

// Incorrect
const [data, setData] = useState();
useEffect(() => {
  fetch('/api/graphql').then(r => setData(r));
}, []);
```

**Rationale**: TanStack Query provides caching, deduplication, background refresh, and error handling.

### INV-A006: Zustand for Client/UI State Only

Zustand stores must only contain client-side state (theme, selected person, panel visibility). Server state belongs in TanStack Query.

```typescript
// Correct Zustand usage
interface UIState {
  theme: 'dark' | 'light' | 'system';
  selectedPersonId: string | null;
  isPanelOpen: boolean;
}

// Incorrect - server state in Zustand
interface BadState {
  people: Person[]; // Should be in TanStack Query
  constellation: Constellation; // Should be in TanStack Query
}
```

**Rationale**: Separation of concerns. Server state needs cache invalidation and sync.

### INV-A007: GraphQL Client Includes Auth Header

The GraphQL client automatically includes the Bearer token from auth store. Never manually add auth headers.

```typescript
// Correct - token added automatically
const data = await graphqlClient.request(query, variables);

// Incorrect - manual header
const data = await fetch('/api/graphql', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Rationale**: Centralized auth handling prevents token inconsistency.

### INV-A008: No Direct Database Access in React Components

React components must never import `@prisma/client` directly. All database operations go through GraphQL API.

```typescript
// Correct - API call via hook
const { data } = usePeople();

// Incorrect - direct Prisma in component
import { prisma } from '@/lib/prisma';
const people = await prisma.person.findMany(); // WRONG
```

**Rationale**: Prisma is server-only. Direct import would fail in browser and bypass auth.

### INV-A009: Scene Cleanup on Unmount

Three.js scenes must dispose of geometries, materials, and textures when unmounting to prevent memory leaks.

```typescript
// Correct
useEffect(() => {
  return () => {
    disposeScene(scene);
    renderer.dispose();
  };
}, []);

// Incorrect - no cleanup
useEffect(() => {
  // Create scene...
  // No cleanup function
}, []);
```

**Rationale**: WebGL/WebGPU resources are not garbage collected. Manual disposal required.

---

## UI Invariants (INV-U)

### INV-U001: Dark Theme is Default

The application defaults to dark theme (cosmic aesthetic). System preference is respected if explicitly set.

```typescript
// In ThemeProvider
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
```

**Rationale**: The constellation visualization is designed for dark backgrounds (space aesthetic).

### INV-U002: Keyboard Navigation Support

All interactive elements must be keyboard accessible. Use Radix UI primitives which handle this automatically.

```typescript
// Correct - Radix handles keyboard
<DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>

// Incorrect - custom click handler only
<div onClick={handleClick}>Menu</div>
```

**Rationale**: Accessibility requirement (WCAG 2.1 AA target).

### INV-U003: Form Validation Uses Zod

All form validation must use Zod schemas with React Hook Form integration.

```typescript
// Correct
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Incorrect - manual validation
if (!email.includes('@')) { setError('Invalid email'); }
```

**Rationale**: Consistent validation, type inference, and error messaging.

---

## Infrastructure Invariants (INV-I)

### INV-I001: Cloud Build Triggers on Main Branch

Deployments occur automatically when PRs merge to `main`. Direct pushes to `main` are blocked.

**Rationale**: Ensures all code is reviewed and CI passes before deployment.

### INV-I002: CI Must Pass Before Deploy

Cloud Build runs lint, typecheck, and tests before deployment. Any failure blocks the deploy.

```yaml
# cloudbuild.yaml
steps:
  - name: 'node'
    args: ['npm', 'run', 'lint']
  - name: 'node'
    args: ['npm', 'run', 'typecheck']
  - name: 'node'
    args: ['npm', 'test', '--', '--run']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', ...] # Only runs if above pass
```

**Rationale**: Prevents broken deployments.

### INV-I003: Secrets from Secret Manager

Production secrets (Firebase credentials, database URL) come from GCP Secret Manager, not environment files.

```yaml
# Cloud Run service
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef: database-url
```

**Rationale**: Secure credential management with audit trail.

### INV-I004: Prisma Migrations in Dockerfile

Database migrations run automatically at container startup, not manually.

```dockerfile
CMD npx prisma migrate deploy && node server.js
```

**Rationale**: Ensures schema is always up-to-date with code.

---

## Adding New Invariants

When discovering new architectural constraints:

1. Add to this document with next available number (e.g., INV-D006)
2. Include code examples of correct and incorrect usage
3. Explain the rationale
4. Consider adding a test to enforce the invariant
5. Update related documentation

---

*Created: 2026-01-13*
*Last Updated: 2026-01-13*
