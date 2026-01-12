# Ancestral Vision - Claude Code Instructions

## Project Overview

Ancestral Vision is a 3D family tree visualization platform using WebGPU/Three.js for rendering ancestral connections as an interactive constellation.

## Tech Stack

- **Frontend**: Next.js 15+, React 19, TypeScript
- **3D Rendering**: Three.js r171+ with WebGPU (TSL shaders)
- **API**: GraphQL Yoga
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Firebase Genkit with Vertex AI
- **Infrastructure**: Google Cloud (Cloud Run, Cloud SQL, Cloud Storage)

## Code Conventions

### TypeScript Style

- Use `private _` prefix for private members
- Use explicit `public` for public methods
- Complete type annotations on all functions
- No `any` types - define proper interfaces
- Interfaces in `src/types/` directory

### File Organization

```
src/
├── types/          # Shared TypeScript interfaces
├── lib/            # Utility libraries
├── components/     # React components
├── graphql/        # GraphQL schema and resolvers
├── ai/             # Genkit flows and prompts
└── visualization/  # Three.js/WebGPU rendering
```

### Testing

- Vitest for unit and integration tests
- Test files co-located: `file.ts` → `file.test.ts`
- Use factory functions for test data
- TDD workflow encouraged

## Planning Protocol

Before implementing features, create a plan following `docs/plans/CLAUDE.md`:

1. Create `docs/plans/active/<feature>/spec.md`
2. Create `docs/plans/active/<feature>/development-plan.md`
3. Create `docs/plans/active/<feature>/work-notes.md`

## Available Agents

Specialized agents in `.claude/agents/`:

| Agent | Use For |
|-------|---------|
| `typescript-stylist` | Type safety, code patterns |
| `test-engineer` | Vitest, TDD workflow |
| `webgpu-specialist` | WebGPU, TSL, Three.js WebGPURenderer |
| `threejs-engineer` | 3D scenes, cameras, controls |
| `graphql-architect` | GraphQL Yoga, schema design |
| `prisma-specialist` | Database schema, migrations |
| `gcp-architect` | GCP infrastructure, MCP servers |
| `genkit-agent` | AI flows, Vertex AI |
| `performance-analyst` | 3D/DB optimization |
| `docs-navigator` | Finding documentation |

## Key Documentation

- `docs/plans/grand_plan/` - Project master plan (14 documents)
- `docs/plans/CLAUDE.md` - AI planning protocol
- `docs/plans/templates/` - Planning templates

## Commands

```bash
# Development
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Production build

# Database
npx prisma migrate dev    # Run migrations
npx prisma studio         # Open database GUI
npx prisma generate       # Generate client

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## Important Notes

- WebGPU requires `three/webgpu` and `three/tsl` imports
- Must `await renderer.init()` before using WebGPURenderer
- Use `renderer.setAnimationLoop()` not `requestAnimationFrame`
- GCP operations should use MCP servers when available
