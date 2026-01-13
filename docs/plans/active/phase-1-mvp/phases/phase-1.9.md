# Phase 1.9: Settings

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement account settings page with profile management, preference settings, and security options (email/password change via Firebase Auth).

---

## Invariants Enforced in This Phase

- **INV-S001**: All GraphQL Mutations Require Authentication
- **INV-S002**: Users Can Only Access Their Own Data
- **INV-A005**: TanStack Query for Server State
- **INV-A006**: Zustand for Client/UI State Only

---

## Existing Schema

The User model already has preferences stored as JSON:

```prisma
model User {
  id          String  @id // Firebase UID
  email       String  @unique
  displayName String
  avatarUrl   String?
  preferences Json    @default("{\"theme\":\"dark\",\"defaultPrivacy\":\"private\",...}")
  // ...
}
```

---

## TDD Steps

### Step 1.9.1: Write Settings Resolver Tests (RED)

Create `src/graphql/resolvers/settings.test.ts`:

**Test Cases**:

1. `it('should return null for unauthenticated user')` - Auth guard
2. `it('should return user settings for authenticated user')` - Get settings
3. `it('should update display name')` - Profile update
4. `it('should update theme preference')` - Theme setting
5. `it('should update default privacy preference')` - Privacy setting
6. `it('should update email notifications preference')` - Notification setting
7. `it('should reject invalid theme value')` - Validation
8. `it('should reject invalid privacy value')` - Validation

### Step 1.9.2: Write Settings Hook Tests (RED)

Create `src/hooks/use-settings.test.tsx`:

**Test Cases**:

1. `it('should fetch user settings')` - useSettings hook
2. `it('should update profile')` - useUpdateProfile mutation
3. `it('should update preferences')` - useUpdatePreferences mutation
4. `it('should handle loading states')` - Loading flags
5. `it('should invalidate queries on mutation success')` - Cache invalidation

### Step 1.9.3: Write SettingsForm Component Tests (RED)

Create `src/components/settings-form.test.tsx`:

**Test Cases**:

1. `it('should render profile section')` - Display name input
2. `it('should render theme selector')` - Theme options
3. `it('should render privacy selector')` - Privacy options
4. `it('should render notification toggles')` - Notification settings
5. `it('should show current values')` - Initial values
6. `it('should validate display name')` - Required validation
7. `it('should submit form on save')` - Form submission
8. `it('should show success message')` - Success feedback
9. `it('should show error message')` - Error feedback
10. `it('should disable save when unchanged')` - Dirty tracking

### Step 1.9.4: Write SecuritySettings Component Tests (RED)

Create `src/components/security-settings.test.tsx`:

**Test Cases**:

1. `it('should render email change form')` - Email input
2. `it('should render password change form')` - Password inputs
3. `it('should validate email format')` - Email validation
4. `it('should validate password requirements')` - Password validation
5. `it('should require current password for email change')` - Security
6. `it('should require password confirmation')` - Match validation
7. `it('should call Firebase Auth for email change')` - Auth integration
8. `it('should call Firebase Auth for password change')` - Auth integration
9. `it('should show success message')` - Success feedback
10. `it('should show error message')` - Error feedback

### Step 1.9.5: Write Settings Page Tests (RED)

Create `src/app/(app)/settings/page.test.tsx`:

**Test Cases**:

1. `it('should redirect unauthenticated users')` - Auth redirect
2. `it('should show settings form')` - Form display
3. `it('should show security section')` - Security options
4. `it('should show loading state')` - Loading indicator

---

## Implementation Steps

### Step 1.9.6: Implement Settings GraphQL Schema (GREEN)

Update `src/graphql/schema.ts`:

```graphql
type UserSettings {
  id: ID!
  email: String!
  displayName: String!
  avatarUrl: String
  preferences: UserPreferences!
}

type UserPreferences {
  theme: Theme!
  defaultPrivacy: PrivacyLevel!
  emailNotifications: Boolean!
  emailDigestFrequency: EmailDigestFrequency!
}

enum Theme {
  LIGHT
  DARK
  SYSTEM
}

enum EmailDigestFrequency {
  DAILY
  WEEKLY
  NEVER
}

input UpdateProfileInput {
  displayName: String
  avatarUrl: String
}

input UpdatePreferencesInput {
  theme: Theme
  defaultPrivacy: PrivacyLevel
  emailNotifications: Boolean
  emailDigestFrequency: EmailDigestFrequency
}

extend type Query {
  userSettings: UserSettings
}

extend type Mutation {
  updateProfile(input: UpdateProfileInput!): UserSettings!
  updatePreferences(input: UpdatePreferencesInput!): UserSettings!
}
```

### Step 1.9.7: Implement Settings Resolvers (GREEN)

Create `src/graphql/resolvers/settings-resolvers.ts`

### Step 1.9.8: Implement Settings Hooks (GREEN)

Create `src/hooks/use-settings.ts`

### Step 1.9.9: Implement SettingsForm Component (GREEN)

Create `src/components/settings-form.tsx`

### Step 1.9.10: Implement SecuritySettings Component (GREEN)

Create `src/components/security-settings.tsx`

### Step 1.9.11: Implement Settings Page (GREEN)

Create `src/app/(app)/settings/page.tsx`

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/graphql/schema.ts` | MODIFY | Add settings types and operations |
| `src/graphql/resolvers/settings-resolvers.ts` | CREATE | Settings resolver implementation |
| `src/graphql/resolvers/settings.test.ts` | CREATE | Resolver tests |
| `src/hooks/use-settings.ts` | CREATE | TanStack Query hooks |
| `src/hooks/use-settings.test.tsx` | CREATE | Hook tests |
| `src/components/settings-form.tsx` | CREATE | Profile/preferences form |
| `src/components/settings-form.test.tsx` | CREATE | Form tests |
| `src/components/security-settings.tsx` | CREATE | Email/password change |
| `src/components/security-settings.test.tsx` | CREATE | Security tests |
| `src/app/(app)/settings/page.tsx` | CREATE | Settings page route |
| `src/app/(app)/settings/page.test.tsx` | CREATE | Page tests |

---

## Verification

```bash
# Run specific tests
npx vitest run src/graphql/resolvers/settings.test.ts
npx vitest run src/hooks/use-settings.test.tsx
npx vitest run src/components/settings-form.test.tsx
npx vitest run src/components/security-settings.test.tsx
npx vitest run src/app/(app)/settings/page.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [x] All ~30 settings tests pass (36 tests added, 796 total)
- [x] UserSettings query returns user data
- [x] Profile update mutation works
- [x] Preferences update mutation works
- [x] Theme selector works (dark/light/system)
- [x] Privacy selector works
- [x] Email change with Firebase Auth works
- [x] Password change with Firebase Auth works
- [x] Form validation works
- [x] Success/error feedback shown
- [x] Settings page redirects unauthenticated users
- [x] Type check passes (for Phase 1.9 files)

---

*Created: 2026-01-13*
*Completed: 2026-01-13*
