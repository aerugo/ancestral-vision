# Feature: Template Mode for Visual Testing

**Status**: Draft
**Created**: 2026-01-15
**User Stories**: US-DEV-001 (Developer visual testing workflow)

## Goal

Enable developers to run the dev server with `--template` flag to automatically load a pre-populated constellation from `data/example-genealogy.json`, bypassing authentication and onboarding for rapid visual testing.

## Background

The project requires manual visual comparison between the WebGL prototype (`reference_prototypes/family-constellations/`) and the new WebGPU implementation. Currently, testing requires:
1. Starting the dev server
2. Registering/logging in with Firebase
3. Completing onboarding wizard
4. Manually adding test data

This creates friction for visual testing workflows. A template mode would allow developers to immediately see the constellation with rich data (119 persons, 151 relationships) for visual comparison and debugging.

## Acceptance Criteria

- [ ] AC1: Running `npm run dev -- --template` starts the dev server with template mode enabled
- [ ] AC2: If no user with id `template-user` exists, create one with username "templateperson"
- [ ] AC3: Template user's constellation is populated from `data/example-genealogy.json`
- [ ] AC4: The `centeredPersonId` from the JSON metadata is used as the constellation center
- [ ] AC5: All persons from the JSON are imported with correct field mappings
- [ ] AC6: All parent-child and spouse relationships are imported
- [ ] AC7: Login page is bypassed - user goes directly to `/constellation`
- [ ] AC8: Onboarding is bypassed - status set to COMPLETED
- [ ] AC9: Template mode only works in development environment (NODE_ENV=development)
- [ ] AC10: Regular dev mode (`npm run dev`) works unchanged

## Technical Requirements

### Database Changes
- No schema changes required
- Uses existing User, Constellation, Person, ParentChildRelationship, SpouseRelationship models

### Environment Configuration
- New environment variable: `NEXT_PUBLIC_TEMPLATE_MODE=true` (set via dev script)
- Template mode detection in client-side code

### Scripts/Commands
- New seed script: `prisma/seed-template.ts`
- Modified dev command in package.json

### API Changes
- None - uses existing GraphQL API

### UI Changes
- Auth provider: detect template mode and auto-authenticate
- Onboarding check: bypass when template mode active

## Dependencies

- Existing Prisma schema and models
- `data/example-genealogy.json` file (already exists)
- Firebase emulator for development auth

## Out of Scope

- Production template mode (development only)
- Template data editing (read-only for visual testing)
- Multiple template datasets (single file only)
- Template mode for test runners (this is for manual visual testing)

## Security Considerations

- Template mode MUST only be available in development (NODE_ENV=development)
- Template user should not have access to production Firebase
- No Firebase tokens generated - mock auth only

## Open Questions

- [x] Q1: Should template mode use Firebase emulator or bypass Firebase entirely?
  - **Decision**: Bypass Firebase entirely with mock auth to simplify setup
- [x] Q2: Should template data persist across dev server restarts?
  - **Decision**: Yes, seed once and persist. Re-seed only if --template-reseed flag passed
- [x] Q3: How to handle the centeredPersonId mapping?
  - **Decision**: Use the ID directly from the JSON metadata

---

*Template version: 1.0*
