# Claude Code Agents - Development Plan

**Status**: Complete
**Created**: 2026-01-12
**Branch**: `main` (direct commit - documentation only)
**Spec**: [spec.md](spec.md)

## Summary

Create 10 specialized Claude Code agents covering the full Ancestral Vision tech stack, with particular focus on:
- **WebGPU specialist**: TSL patterns, fallback strategies, TypeScript workarounds
- **GCP architect**: Infrastructure management via MCP servers, deployment patterns

## Critical Invariants to Respect

No code invariants apply - this is documentation/configuration only.

**New conventions introduced**:

- **CONV-A001**: All agents use standard frontmatter format (name, description, tools, model)
- **CONV-A002**: Agent descriptions start with "Use PROACTIVELY when..." for auto-triggering
- **CONV-A003**: Agents reference invariants by INV-xxx ID, not inline descriptions

## Current State Analysis

### Existing Assets

| Source | Files | Notes |
|--------|-------|-------|
| Reference prototypes | `typescript-stylist.md`, `test-engineer.md` | Good templates, need adaptation |
| SimCash (conversation) | `docs-navigator.md`, `performance.md`, etc. | Patterns to adapt |
| `.claude/` directory | Empty | Needs population |

### Files to Create

| File | Purpose |
|------|---------|
| `.claude/agents/typescript-stylist.md` | Type safety patterns |
| `.claude/agents/test-engineer.md` | Vitest/TDD workflow |
| `.claude/agents/webgpu-specialist.md` | WebGPU + TSL patterns |
| `.claude/agents/threejs-engineer.md` | General 3D visualization |
| `.claude/agents/graphql-architect.md` | GraphQL Yoga patterns |
| `.claude/agents/prisma-specialist.md` | Database operations |
| `.claude/agents/gcp-architect.md` | GCP infrastructure + MCP servers |
| `.claude/agents/docs-navigator.md` | Documentation guide |
| `.claude/agents/performance-analyst.md` | Optimization specialist |
| `.claude/agents/genkit-agent.md` | AI flow development |

## Solution Design

```
Phase 1: Foundation Agents (adapt from existing)
├── typescript-stylist (from reference)
├── test-engineer (from reference)
└── docs-navigator (from SimCash)

Phase 2: Core Tech Agents (new)
├── webgpu-specialist (research-based)
├── threejs-engineer (new)
├── graphql-architect (new)
└── gcp-architect (research-based)

Phase 3: Data & AI Agents (new)
├── prisma-specialist (new)
├── genkit-agent (new)
└── performance-analyst (from SimCash)
```

### Key Design Decisions

1. **Separate WebGPU from Three.js**: WebGPU is specialized enough (TSL, async init, TypeScript issues) to warrant its own agent vs. combining with general Three.js
2. **Adapt vs. Copy**: Reference agents need adaptation for this project's conventions (invariant references, tech stack specifics)
3. **Sonnet for all**: Use sonnet model for all agents (fast, capable) - no opus needed for these specialized tasks

## Phase Overview

| Phase | Description | Agents | Est. Time |
|-------|-------------|--------|-----------|
| 1 | Foundation Agents | 3 agents | Quick - adaptation |
| 2 | Core Tech Agents | 4 agents | Medium - new content + research |
| 3 | Data & AI Agents | 3 agents | Medium - new content |

---

## Phase 1: Foundation Agents

**Goal**: Establish base agents by adapting proven templates
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `.claude/agents/typescript-stylist.md` - Adapted from reference
2. `.claude/agents/test-engineer.md` - Adapted from reference
3. `.claude/agents/docs-navigator.md` - Adapted from SimCash

### Approach

1. Copy reference agents
2. Update for Ancestral Vision conventions
3. Add invariant references
4. Update file paths and tech stack specifics

### Success Criteria

- [ ] Agents load in Claude Code
- [ ] Proactive triggers match project needs
- [ ] File paths reference correct locations

---

## Phase 2: Core Tech Agents

**Goal**: Create specialized agents for 3D, API, and infrastructure layers
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. `.claude/agents/webgpu-specialist.md` - WebGPU + TSL expert
2. `.claude/agents/threejs-engineer.md` - General 3D visualization
3. `.claude/agents/graphql-architect.md` - GraphQL Yoga patterns
4. `.claude/agents/gcp-architect.md` - GCP infrastructure + MCP servers

### Approach

1. WebGPU: Incorporate research findings (TSL, fallback, TypeScript workarounds)
2. Three.js: Focus on scene management, camera, controls, instancing
3. GraphQL: Schema design, resolver patterns, error handling
4. GCP: MCP server configuration, authentication patterns, deployment operations

### Success Criteria

- [ ] WebGPU agent covers TSL patterns and fallback strategy
- [ ] Three.js agent complements (not duplicates) WebGPU agent
- [ ] GraphQL agent covers Yoga-specific patterns
- [ ] GCP agent covers MCP setup and references 11_deployment_operations.md

---

## Phase 3: Data & AI Agents

**Goal**: Complete agent suite with data layer and AI specialists
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. `.claude/agents/prisma-specialist.md` - Database operations
2. `.claude/agents/genkit-agent.md` - AI flow development
3. `.claude/agents/performance-analyst.md` - Optimization specialist

### Approach

1. Prisma: Schema design, migrations, query patterns, PostgreSQL specifics
2. Genkit: Flow definitions, Vertex AI integration, prompt management
3. Performance: Adapt SimCash patterns for 3D/DB context

### Success Criteria

- [ ] Prisma agent covers migration workflow
- [ ] Genkit agent covers flow patterns
- [ ] Performance agent covers both 3D and database optimization

---

## Testing Strategy

Since these are documentation files, testing is manual verification:

### Verification Checklist (per agent)

- [ ] Frontmatter parses correctly (name, description, tools, model)
- [ ] Description starts with "Use PROACTIVELY when..."
- [ ] Essential Reading paths exist
- [ ] Code examples are syntactically correct
- [ ] No references to non-existent files

### Integration Test

After all agents created:
```bash
# Verify directory structure
ls -la .claude/agents/

# Count agents
ls .claude/agents/*.md | wc -l
# Expected: 10
```

## Documentation Updates

After implementation:

- [ ] Update `13_development.md` Pattern 2 to reference actual agents
- [ ] Create `.claude/CLAUDE.md` main instructions (future task)

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Pending | | | Foundation agents |
| Phase 2 | Pending | | | Core tech agents |
| Phase 3 | Pending | | | Data & AI agents |

---

## Appendix: WebGPU Agent Content Outline

Key sections for the webgpu-specialist:

### 1. Import Patterns
```typescript
// WebGPU imports (not standard three)
import * as THREE from 'three/webgpu';
import {
  MeshStandardNodeMaterial,
  // ... other node materials
} from 'three/webgpu';
import {
  color, positionLocal, time, sin, cos,
  uniform, vec3, Fn
} from 'three/tsl';
```

### 2. Renderer Setup with Fallback
```typescript
const renderer = new THREE.WebGPURenderer({
  antialias: true,
  // forceWebGL: true, // For testing fallback
});

// MUST await init before sync methods
await renderer.init();

// Use setAnimationLoop (not requestAnimationFrame)
renderer.setAnimationLoop(animate);
```

### 3. TSL Node Material Patterns
```typescript
const material = new MeshStandardNodeMaterial();

// Color node
material.colorNode = color(0x44aa88);

// Animated position
material.positionNode = positionLocal.add(
  vec3(0, sin(time.mul(2)).mul(0.5), 0)
);

// Custom shader function
const customEffect = Fn(() => {
  const pos = positionLocal;
  return pos.add(vec3(sin(time), 0, cos(time)));
});
```

### 4. TypeScript Workarounds
```typescript
// If @types/three doesn't export WebGPURenderer:
// @ts-expect-error WebGPU types not fully exported
import { WebGPURenderer } from 'three/webgpu';

// Or use declaration merging in types/three-webgpu.d.ts
```

### 5. Feature Detection
```typescript
async function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true
  });

  await renderer.init();

  // Check what backend was used
  const isWebGPU = renderer.backend.isWebGPUBackend;
  console.log(`Using ${isWebGPU ? 'WebGPU' : 'WebGL'} backend`);

  return renderer;
}
```

---

## Appendix: GCP Architect Agent Content Outline

Key sections for the gcp-architect:

### 1. MCP Server Configuration

```json
// .claude/mcp.json or Claude Desktop config
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"]
    },
    "firebase": {
      "command": "npx",
      "args": ["-y", "@gannonh/firebase-mcp"],
      "env": {
        "SERVICE_ACCOUNT_KEY_PATH": "/path/to/serviceAccountKey.json",
        "FIREBASE_STORAGE_BUCKET": "ancestral-vision-prod.firebasestorage.app"
      }
    }
  }
}
```

### 2. Authentication Setup

```bash
# gcloud authentication (for gcloud MCP)
gcloud auth login
gcloud auth application-default login
gcloud config set project ancestral-vision-prod

# Firebase authentication (requires service account)
# Download key from Firebase Console > Project Settings > Service Accounts
# Set SERVICE_ACCOUNT_KEY_PATH in MCP config
```

### 3. Available MCP Servers

| Server | Package | Purpose |
|--------|---------|---------|
| gcloud | `@google-cloud/gcloud-mcp` | CLI access to GCP resources |
| Firebase | `@gannonh/firebase-mcp` | Firestore, Storage, Auth |
| Database Toolbox | MCP Toolbox | Cloud SQL, BigQuery queries |

### 4. Key Operations via MCP

```bash
# Cloud Run operations (via gcloud MCP)
gcloud run services list
gcloud run revisions list --service ancestral-vision-api
gcloud run services update-traffic ancestral-vision-api --to-revisions=REV=100

# Cloud SQL operations
gcloud sql instances list
gcloud sql databases list --instance=ancestral-vision-prod-db

# Cloud Logging
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Firebase operations (via firebase MCP)
# - List/query Firestore documents
# - Upload/download from Storage
# - Get user info from Auth
```

### 5. Reference Integration

The agent should reference:
- `plans/grand_plan/11_deployment_operations.md` - Full infrastructure spec
- `plans/grand_plan/07_technology_decisions.md` - Tech stack decisions
- Cloud Run, Cloud SQL, Storage configuration

### 6. Security Best Practices

```markdown
- Use service account impersonation for least-privilege
- Never commit service account keys to Git
- Use Secret Manager for production credentials
- Enable audit logging for MCP operations
- Use IAM roles, not individual permissions
```

---

*Plan ready for review*
