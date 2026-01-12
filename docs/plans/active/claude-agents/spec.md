# Feature: Claude Code Agent Configuration

**Status**: Complete
**Created**: 2026-01-12
**User Stories**: All development work (supports 13_development.md Pattern 2)

## Goal

Create a comprehensive set of specialized Claude Code agents to accelerate AI-augmented development on Ancestral Vision.

## Background

The project follows an AI-augmented development workflow (13_development.md) that relies on specialized agents for different domains. The reference prototypes contain two example agents (typescript-stylist, test-engineer), but the project needs a complete set covering all tech stack areas.

WebGPU is a particularly important new technology for this project's 3D constellation visualization. Since WebGPU is still evolving (Three.js recommends r171+), a dedicated agent with current best practices is essential.

## Acceptance Criteria

- [x] AC1: All agents follow the standard frontmatter format (name, description, tools, model)
- [x] AC2: Each agent has clear "When to Use" triggers for proactive invocation
- [x] AC3: WebGPU agent includes TSL patterns, fallback strategies, and TypeScript workarounds
- [x] AC4: Agents reference project invariants (docs/invariants/) appropriately
- [x] AC5: Agents can be loaded by Claude Code from `.claude/agents/` directory
- [x] AC6: GCP agent includes MCP server configuration and authentication patterns

## Agents to Create

| Agent | Domain | Priority | Source |
|-------|--------|----------|--------|
| `typescript-stylist` | Type safety, code patterns | High | Adapt from reference |
| `test-engineer` | Vitest, TDD workflow | High | Adapt from reference |
| `webgpu-specialist` | WebGPU, TSL, Three.js WebGPURenderer | High | New - research-based |
| `threejs-engineer` | 3D visualization (WebGL fallback) | High | New |
| `graphql-architect` | Schema design, resolvers, Yoga | High | New |
| `prisma-specialist` | Database schema, migrations | High | New |
| `gcp-architect` | GCP infrastructure, MCP servers, deployment | High | New - research-based |
| `docs-navigator` | Project documentation | Medium | Adapt from SimCash |
| `performance-analyst` | 3D/DB optimization, profiling | Medium | Adapt from SimCash |
| `genkit-agent` | AI flows, Vertex AI | Medium | New |

## Technical Requirements

### Directory Structure

```
.claude/
├── CLAUDE.md              # Main project instructions
├── settings.json          # Claude Code settings
└── agents/
    ├── typescript-stylist.md
    ├── test-engineer.md
    ├── webgpu-specialist.md
    ├── threejs-engineer.md
    ├── graphql-architect.md
    ├── prisma-specialist.md
    ├── gcp-architect.md
    ├── docs-navigator.md
    ├── performance-analyst.md
    └── genkit-agent.md
```

### Agent File Format

```markdown
---
name: agent-name
description: When to use this agent PROACTIVELY...
tools: Read, Edit, Glob, Grep, Bash
model: sonnet
---

# Agent Title

## Role
One-paragraph expertise description.

## When to Use This Agent
Bullet list of trigger scenarios.

## Essential Reading
Files agent should read first.

## Key Patterns
Code examples and patterns.

## Verification Commands
How to validate work.

## What NOT to Do
Anti-patterns and boundaries.
```

## WebGPU Research Summary

Based on current research (2025-2026):

### Key Findings

1. **Import Pattern**: Use `three/webgpu` and `three/tsl` (not standard three imports)
2. **TSL (Three Shading Language)**: Write shaders in JS-like syntax, auto-transpiles to GLSL/WGSL
3. **Automatic Fallback**: WebGPURenderer falls back to WebGL when WebGPU unavailable
4. **TypeScript Issues**: `@types/three` may not export WebGPURenderer - needs workarounds
5. **Initialization**: Must await `renderer.init()` or use `renderer.setAnimationLoop()`
6. **Version**: Target Three.js r171+ for stability
7. **Performance**: Benefits vary - some scenes faster in WebGL still

### Migration Patterns

```typescript
// Old WebGL
import * as THREE from 'three';
const renderer = new THREE.WebGLRenderer();

// New WebGPU (with fallback)
import * as THREE from 'three/webgpu';
const renderer = new THREE.WebGPURenderer();
await renderer.init();
renderer.setAnimationLoop(animate);
```

### TSL Node Materials

```typescript
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, positionLocal, time, sin } from 'three/tsl';

const material = new MeshStandardNodeMaterial();
material.colorNode = color(0xff0000);
material.positionNode = positionLocal.add(sin(time).mul(0.1));
```

## GCP MCP Research Summary

Based on current research (2025-2026):

### Available MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| `@google-cloud/gcloud-mcp` | gcloud CLI access | Available |
| `@gannonh/firebase-mcp` | Firebase/Firestore operations | Available |
| MCP Toolbox for Databases | Cloud SQL, BigQuery, AlloyDB | Available |
| BigQuery MCP | Enterprise data queries | Official Google |
| GCE MCP | Compute Engine management | Official Google |
| GKE MCP | Kubernetes operations | Official Google |
| Cloud Run MCP | Serverless deployment | Coming Soon |
| Cloud SQL MCP | Database management | Coming Soon |
| Cloud Storage MCP | Object storage | Coming Soon |
| Cloud Logging MCP | Log queries | Coming Soon |

### Recommended MCP Configuration for Ancestral Vision

Based on 11_deployment_operations.md infrastructure:

```json
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

### Authentication Patterns

1. **gcloud MCP**: Uses active `gcloud auth` credentials
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project ancestral-vision-prod
   ```

2. **Firebase MCP**: Requires service account key
   - Download from Firebase Console > Project Settings > Service Accounts
   - Set `SERVICE_ACCOUNT_KEY_PATH` environment variable

3. **MCP Toolbox (Cloud SQL)**: Uses Application Default Credentials
   ```bash
   gcloud auth application-default login
   ```

### Key gcloud MCP Capabilities

- Query Cloud Run services and revisions
- Manage Cloud SQL instances
- View Cloud Logging entries
- Manage Cloud Storage buckets
- Deploy and rollback services

### Firebase MCP Tools

- **Firestore**: Add, list, get, update, delete documents
- **Storage**: List files, upload, get download URLs
- **Auth**: Get user by ID or email

### Security Considerations

- Use service account impersonation for least-privilege access
- Never commit service account keys to Git
- Use Secret Manager for production credentials
- Enable IAM audit logging for MCP operations

## Dependencies

- Reference prototype agents exist at `reference_prototypes/family-constellations/.claude/agents/`
- SimCash agents provided in conversation context
- Project planning docs complete (plans/grand_plan/)

## Out of Scope

- Creating the `.claude/CLAUDE.md` main instructions file (separate task)
- MCP server configuration (separate task per 13_development.md Pattern 3)
- Invariants documentation (separate task per 13_development.md Pattern 1)

## Security Considerations

- Agents should never store secrets or credentials
- Infrastructure-ops agent should use MCP for GCP operations, not hardcoded credentials

## Open Questions

- [x] Q1: What WebGPU best practices apply in 2025/2026? (Researched - see summary above)
- [x] Q2: Should we create a combined threejs-engineer or separate webgpu-specialist? (Decided: separate - WebGPU is specialized enough)
- [x] Q3: What MCP servers are available for GCP? (Researched - see GCP MCP summary above)

## References

### WebGPU
- [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/)
- [Three.js WebGPU Renderer Tutorial](https://sbcode.net/threejs/webgpu-renderer/)
- [WebGL to WebGPU Migration](https://medium.com/@sudenurcevik/upgrading-performance-moving-from-webgl-to-webgpu-in-three-js-4356e84e4702)
- [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [WebGPU and TSL (Threlte)](https://threlte.xyz/docs/learn/advanced/webgpu)

### GCP MCP
- [Google Cloud MCP Overview](https://docs.cloud.google.com/mcp/overview)
- [gcloud MCP Server (GitHub)](https://github.com/googleapis/gcloud-mcp)
- [Firebase MCP Server (GitHub)](https://github.com/gannonh/firebase-mcp)
- [MCP Toolbox for Databases](https://cloud.google.com/blog/products/ai-machine-learning/mcp-toolbox-for-databases-now-supports-model-context-protocol)
- [Announcing Official MCP Support](https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services)

---

*Template version: 1.0*
