# Phase 1.8: Onboarding

**Status**: In Progress
**Started**: 2026-01-13
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement a first-run onboarding wizard that guides new users through creating their initial family tree, culminating in an "aha moment" camera reveal of their constellation.

---

## Invariants Enforced in This Phase

- **INV-S001**: All GraphQL Mutations Require Authentication
- **INV-S002**: Users Can Only Access Their Own Constellation
- **INV-A005**: TanStack Query for Server State
- **INV-A006**: Zustand for Client/UI State Only
- **INV-U002**: Keyboard Navigation Support

---

## Existing Prisma Schema

The OnboardingProgress model already exists in `prisma/schema.prisma`:

```prisma
model OnboardingProgress {
  id               String           @id @default(uuid())
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId           String           @unique
  status           OnboardingStatus @default(NOT_STARTED)
  currentStep      OnboardingStep   @default(TOUR)
  completedSteps   OnboardingStep[]
  savedData        Json?
  hasCompletedTour Boolean          @default(false)
  tourSkipped      Boolean          @default(false)
  startedAt        DateTime         @default(now())
  lastUpdatedAt    DateTime         @updatedAt
  completedAt      DateTime?
}

enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum OnboardingStep {
  TOUR
  ADD_SELF
  ADD_PARENTS
  ADD_GRANDPARENTS
  AHA_MOMENT
}
```

---

## TDD Steps

### Step 1.8.1: Write Onboarding Resolver Tests (RED)

Create `src/graphql/resolvers/onboarding.test.ts`:

**Test Cases**:

1. `it('should return null for unauthenticated user')` - Auth guard
2. `it('should return onboarding progress for authenticated user')` - Get progress
3. `it('should create progress if none exists')` - Auto-create
4. `it('should start onboarding and set status to IN_PROGRESS')` - Start mutation
5. `it('should update current step')` - Step navigation
6. `it('should add step to completedSteps')` - Mark complete
7. `it('should save step data as JSON')` - Data persistence
8. `it('should complete onboarding')` - Final completion
9. `it('should skip onboarding')` - Skip flow
10. `it('should mark tour as completed')` - Tour tracking
11. `it('should skip tour')` - Tour skip
12. `it('should not allow going back to completed steps')` - Step validation

### Step 1.8.2: Write Onboarding Hook Tests (RED)

Create `src/hooks/use-onboarding.test.tsx`:

**Test Cases**:

1. `it('should return onboarding progress')` - useOnboarding hook
2. `it('should start onboarding')` - useStartOnboarding mutation
3. `it('should update step')` - useUpdateOnboardingStep mutation
4. `it('should complete step')` - useCompleteStep mutation
5. `it('should save step data')` - useSaveStepData mutation
6. `it('should complete onboarding')` - useCompleteOnboarding mutation
7. `it('should skip onboarding')` - useSkipOnboarding mutation
8. `it('should handle loading states')` - Loading flags
9. `it('should invalidate queries on mutation success')` - Cache invalidation

### Step 1.8.3: Write OnboardingWizard Component Tests (RED)

Create `src/components/onboarding-wizard.test.tsx`:

**Test Cases**:

1. `it('should render tour step initially')` - Initial state
2. `it('should navigate to next step on continue')` - Step progression
3. `it('should show add yourself step')` - Self step
4. `it('should show add parents step')` - Parents step
5. `it('should show add grandparents step')` - Grandparents step
6. `it('should show aha moment step')` - Final reveal
7. `it('should allow skipping steps')` - Skip button
8. `it('should show skip all option')` - Skip entire wizard
9. `it('should save form data between steps')` - Data persistence
10. `it('should show progress indicator')` - Step progress
11. `it('should handle keyboard navigation')` - Tab/Enter
12. `it('should call onComplete when finished')` - Completion callback

### Step 1.8.4: Write OnboardingStep Component Tests (RED)

Create `src/components/onboarding-step.test.tsx`:

**Test Cases**:

1. `it('should render step content')` - Content display
2. `it('should show step title')` - Title
3. `it('should show step description')` - Description
4. `it('should render children')` - Child components
5. `it('should show continue button')` - Primary action
6. `it('should show skip button when skippable')` - Skip option
7. `it('should disable continue when form invalid')` - Validation
8. `it('should call onContinue')` - Continue handler
9. `it('should call onSkip')` - Skip handler

### Step 1.8.5: Write PersonQuickForm Component Tests (RED)

Create `src/components/person-quick-form.test.tsx`:

**Test Cases**:

1. `it('should render name inputs')` - Given name, surname
2. `it('should render birth year input')` - Birth year
3. `it('should validate required fields')` - Validation
4. `it('should submit valid data')` - Form submission
5. `it('should show validation errors')` - Error display
6. `it('should support optional maiden name')` - Optional field
7. `it('should call onChange on input')` - Controlled input

### Step 1.8.6: Write Onboarding Page Tests (RED)

Create `src/app/onboarding/page.test.tsx`:

**Test Cases**:

1. `it('should redirect unauthenticated users')` - Auth redirect
2. `it('should redirect completed users to constellation')` - Completed redirect
3. `it('should show wizard for new users')` - Initial display
4. `it('should navigate to constellation on complete')` - Completion redirect

---

## Implementation Steps

### Step 1.8.7: Implement Onboarding GraphQL Schema (GREEN)

Update `src/graphql/schema.ts`:

```typescript
// Add to typeDefs
enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum OnboardingStep {
  TOUR
  ADD_SELF
  ADD_PARENTS
  ADD_GRANDPARENTS
  AHA_MOMENT
}

type OnboardingProgress {
  id: ID!
  status: OnboardingStatus!
  currentStep: OnboardingStep!
  completedSteps: [OnboardingStep!]!
  savedData: JSON
  hasCompletedTour: Boolean!
  tourSkipped: Boolean!
  startedAt: DateTime!
  lastUpdatedAt: DateTime!
  completedAt: DateTime
}

extend type Query {
  onboardingProgress: OnboardingProgress
}

extend type Mutation {
  startOnboarding: OnboardingProgress!
  updateOnboardingStep(step: OnboardingStep!): OnboardingProgress!
  completeOnboardingStep(step: OnboardingStep!, data: JSON): OnboardingProgress!
  saveOnboardingData(data: JSON!): OnboardingProgress!
  completeTour: OnboardingProgress!
  skipTour: OnboardingProgress!
  completeOnboarding: OnboardingProgress!
  skipOnboarding: OnboardingProgress!
}
```

### Step 1.8.8: Implement Onboarding Resolvers (GREEN)

Create `src/graphql/resolvers/onboarding-resolvers.ts`:

```typescript
import type { GraphQLContext } from '../context';

export const onboardingResolvers = {
  Query: {
    onboardingProgress: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return null;

      // Get or create onboarding progress
      let progress = await ctx.prisma.onboardingProgress.findUnique({
        where: { userId: ctx.user.uid },
      });

      if (!progress) {
        progress = await ctx.prisma.onboardingProgress.create({
          data: { userId: ctx.user.uid },
        });
      }

      return progress;
    },
  },

  Mutation: {
    startOnboarding: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      return ctx.prisma.onboardingProgress.upsert({
        where: { userId: ctx.user.uid },
        update: { status: 'IN_PROGRESS' },
        create: { userId: ctx.user.uid, status: 'IN_PROGRESS' },
      });
    },

    updateOnboardingStep: async (
      _: unknown,
      { step }: { step: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error('Authentication required');

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: { currentStep: step as any },
      });
    },

    completeOnboardingStep: async (
      _: unknown,
      { step, data }: { step: string; data?: any },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error('Authentication required');

      const progress = await ctx.prisma.onboardingProgress.findUnique({
        where: { userId: ctx.user.uid },
      });

      const completedSteps = [...(progress?.completedSteps || [])];
      if (!completedSteps.includes(step as any)) {
        completedSteps.push(step as any);
      }

      const savedData = { ...(progress?.savedData as object || {}), [step]: data };

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: {
          completedSteps,
          savedData,
        },
      });
    },

    saveOnboardingData: async (
      _: unknown,
      { data }: { data: any },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error('Authentication required');

      const progress = await ctx.prisma.onboardingProgress.findUnique({
        where: { userId: ctx.user.uid },
      });

      const savedData = { ...(progress?.savedData as object || {}), ...data };

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: { savedData },
      });
    },

    completeTour: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: { hasCompletedTour: true, currentStep: 'ADD_SELF' },
      });
    },

    skipTour: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: { tourSkipped: true, currentStep: 'ADD_SELF' },
      });
    },

    completeOnboarding: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    },

    skipOnboarding: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      return ctx.prisma.onboardingProgress.update({
        where: { userId: ctx.user.uid },
        data: {
          status: 'SKIPPED',
          completedAt: new Date(),
        },
      });
    },
  },
};
```

### Step 1.8.9: Implement Onboarding Hooks (GREEN)

Create `src/hooks/use-onboarding.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-tag';

// GraphQL operations
const ONBOARDING_PROGRESS = gql`
  query OnboardingProgress {
    onboardingProgress {
      id
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const START_ONBOARDING = gql`
  mutation StartOnboarding {
    startOnboarding { ...OnboardingFields }
  }
`;

// ... other mutations

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type OnboardingStep = 'TOUR' | 'ADD_SELF' | 'ADD_PARENTS' | 'ADD_GRANDPARENTS' | 'AHA_MOMENT';

export interface OnboardingProgress {
  id: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  savedData: Record<string, unknown> | null;
  hasCompletedTour: boolean;
  tourSkipped: boolean;
  startedAt: string;
  lastUpdatedAt: string;
  completedAt: string | null;
}

export function useOnboarding() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const result = await graphqlClient.request<{ onboardingProgress: OnboardingProgress | null }>(
        ONBOARDING_PROGRESS
      );
      return result.onboardingProgress;
    },
  });
}

export function useStartOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await graphqlClient.request<{ startOnboarding: OnboardingProgress }>(
        START_ONBOARDING
      );
      return result.startOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
}

// ... other hooks for mutations
```

### Step 1.8.10: Implement OnboardingWizard Component (GREEN)

Create `src/components/onboarding-wizard.tsx`:

```typescript
'use client';

import { useState, useCallback, type ReactElement } from 'react';
import { OnboardingStep } from './onboarding-step';
import { PersonQuickForm } from './person-quick-form';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useOnboarding,
  useUpdateOnboardingStep,
  useCompleteOnboardingStep,
  useCompleteTour,
  useSkipTour,
  useCompleteOnboarding,
  useSkipOnboarding,
  type OnboardingStep as StepType,
} from '@/hooks/use-onboarding';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS: StepType[] = ['TOUR', 'ADD_SELF', 'ADD_PARENTS', 'ADD_GRANDPARENTS', 'AHA_MOMENT'];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps): ReactElement {
  const { data: progress } = useOnboarding();
  const updateStep = useUpdateOnboardingStep();
  const completeStep = useCompleteOnboardingStep();
  const completeTour = useCompleteTour();
  const skipTour = useSkipTour();
  const complete = useCompleteOnboarding();
  const skip = useSkipOnboarding();

  const currentStepIndex = STEPS.indexOf(progress?.currentStep || 'TOUR');
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleContinue = useCallback(async (data?: unknown) => {
    if (!progress) return;

    const currentStep = progress.currentStep;
    const nextIndex = STEPS.indexOf(currentStep) + 1;

    if (currentStep === 'TOUR') {
      await completeTour.mutateAsync();
    } else if (currentStep === 'AHA_MOMENT') {
      await complete.mutateAsync();
      onComplete();
    } else {
      await completeStep.mutateAsync({ step: currentStep, data });
      if (nextIndex < STEPS.length) {
        await updateStep.mutateAsync({ step: STEPS[nextIndex] });
      }
    }
  }, [progress, completeTour, completeStep, updateStep, complete, onComplete]);

  const handleSkipStep = useCallback(async () => {
    if (!progress) return;

    const currentStep = progress.currentStep;
    const nextIndex = STEPS.indexOf(currentStep) + 1;

    if (currentStep === 'TOUR') {
      await skipTour.mutateAsync();
    } else if (nextIndex < STEPS.length) {
      await updateStep.mutateAsync({ step: STEPS[nextIndex] });
    }
  }, [progress, skipTour, updateStep]);

  const handleSkipAll = useCallback(async () => {
    await skip.mutateAsync();
    onComplete();
  }, [skip, onComplete]);

  const renderStepContent = () => {
    switch (progress?.currentStep) {
      case 'TOUR':
        return (
          <OnboardingStep
            title="Welcome to Ancestral Vision"
            description="Discover your family history as a constellation of stars."
            onContinue={handleContinue}
            onSkip={handleSkipStep}
            skippable
          >
            <div className="text-center space-y-4">
              <p>Each person in your family tree becomes a star.</p>
              <p>Watch your constellation grow as you add ancestors.</p>
            </div>
          </OnboardingStep>
        );

      case 'ADD_SELF':
        return (
          <OnboardingStep
            title="Start with yourself"
            description="Add yourself as the first star in your constellation."
            onContinue={handleContinue}
            continueDisabled={false}
          >
            <PersonQuickForm
              label="You"
              onSubmit={handleContinue}
            />
          </OnboardingStep>
        );

      case 'ADD_PARENTS':
        return (
          <OnboardingStep
            title="Add your parents"
            description="Connect your first family links."
            onContinue={handleContinue}
            onSkip={handleSkipStep}
            skippable
          >
            <div className="space-y-6">
              <PersonQuickForm label="Father" />
              <PersonQuickForm label="Mother" />
            </div>
          </OnboardingStep>
        );

      case 'ADD_GRANDPARENTS':
        return (
          <OnboardingStep
            title="Add grandparents (optional)"
            description="Extend your tree another generation."
            onContinue={handleContinue}
            onSkip={handleSkipStep}
            skippable
          >
            <div className="grid grid-cols-2 gap-4">
              <PersonQuickForm label="Paternal Grandfather" compact />
              <PersonQuickForm label="Paternal Grandmother" compact />
              <PersonQuickForm label="Maternal Grandfather" compact />
              <PersonQuickForm label="Maternal Grandmother" compact />
            </div>
          </OnboardingStep>
        );

      case 'AHA_MOMENT':
        return (
          <OnboardingStep
            title="Your constellation awaits"
            description="See your family tree come to life."
            onContinue={handleContinue}
            continueLabel="View My Constellation"
          >
            <div className="text-center">
              <p>Click below to reveal your family constellation.</p>
            </div>
          </OnboardingStep>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Progress value={progressPercent} className="mb-8" />

      {renderStepContent()}

      <div className="mt-8 text-center">
        <Button variant="ghost" size="sm" onClick={handleSkipAll}>
          Skip onboarding
        </Button>
      </div>
    </div>
  );
}
```

### Step 1.8.11: Implement Supporting Components (GREEN)

Create `src/components/onboarding-step.tsx`:

```typescript
'use client';

import { type ReactElement, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface OnboardingStepProps {
  title: string;
  description: string;
  children: ReactNode;
  onContinue: () => void;
  onSkip?: () => void;
  skippable?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
}

export function OnboardingStep({
  title,
  description,
  children,
  onContinue,
  onSkip,
  skippable = false,
  continueDisabled = false,
  continueLabel = 'Continue',
}: OnboardingStepProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex justify-between">
        {skippable && onSkip ? (
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={onContinue} disabled={continueDisabled}>
          {continueLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

Create `src/components/person-quick-form.tsx`:

```typescript
'use client';

import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const personQuickFormSchema = z.object({
  givenName: z.string().min(1, 'Given name is required'),
  surname: z.string().optional(),
  birthYear: z.number().int().min(1000).max(2100).optional(),
});

type PersonQuickFormData = z.infer<typeof personQuickFormSchema>;

interface PersonQuickFormProps {
  label: string;
  onSubmit?: (data: PersonQuickFormData) => void;
  onChange?: (data: Partial<PersonQuickFormData>) => void;
  compact?: boolean;
  className?: string;
}

export function PersonQuickForm({
  label,
  onSubmit,
  onChange,
  compact = false,
  className,
}: PersonQuickFormProps): ReactElement {
  const { register, handleSubmit, formState: { errors } } = useForm<PersonQuickFormData>({
    resolver: zodResolver(personQuickFormSchema),
  });

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className={cn('space-y-2', compact && 'space-y-1')}>
        <Input
          {...register('givenName')}
          placeholder="Given name"
          className={cn(compact && 'h-8 text-sm')}
        />
        {errors.givenName && (
          <p className="text-xs text-destructive">{errors.givenName.message}</p>
        )}
        <Input
          {...register('surname')}
          placeholder="Surname (optional)"
          className={cn(compact && 'h-8 text-sm')}
        />
        {!compact && (
          <Input
            {...register('birthYear', { valueAsNumber: true })}
            type="number"
            placeholder="Birth year (optional)"
          />
        )}
      </div>
    </div>
  );
}
```

### Step 1.8.12: Implement Onboarding Page (GREEN)

Create `src/app/onboarding/page.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: progress, isLoading: progressLoading } = useOnboarding();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Redirect if onboarding completed
  useEffect(() => {
    if (progress?.status === 'COMPLETED' || progress?.status === 'SKIPPED') {
      router.push('/constellation');
    }
  }, [progress, router]);

  const handleComplete = () => {
    router.push('/constellation');
  };

  if (authLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingWizard onComplete={handleComplete} />
    </div>
  );
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/graphql/schema.ts` | MODIFY | Add onboarding types and operations |
| `src/graphql/resolvers/onboarding-resolvers.ts` | CREATE | Onboarding resolver implementation |
| `src/graphql/resolvers/onboarding-resolvers.test.ts` | CREATE | Resolver tests |
| `src/hooks/use-onboarding.ts` | CREATE | TanStack Query hooks |
| `src/hooks/use-onboarding.test.tsx` | CREATE | Hook tests |
| `src/components/onboarding-wizard.tsx` | CREATE | Main wizard component |
| `src/components/onboarding-wizard.test.tsx` | CREATE | Wizard tests |
| `src/components/onboarding-step.tsx` | CREATE | Step wrapper component |
| `src/components/onboarding-step.test.tsx` | CREATE | Step tests |
| `src/components/person-quick-form.tsx` | CREATE | Quick person entry form |
| `src/components/person-quick-form.test.tsx` | CREATE | Form tests |
| `src/app/onboarding/page.tsx` | CREATE | Onboarding route |
| `src/app/onboarding/page.test.tsx` | CREATE | Page tests |

---

## Verification

```bash
# Run specific tests
npx vitest run src/graphql/resolvers/onboarding-resolvers.test.ts
npx vitest run src/hooks/use-onboarding.test.tsx
npx vitest run src/components/onboarding-wizard.test.tsx
npx vitest run src/components/onboarding-step.test.tsx
npx vitest run src/components/person-quick-form.test.tsx
npx vitest run src/app/onboarding/page.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All ~25 onboarding tests pass
- [ ] OnboardingProgress query returns user progress
- [ ] Start/update/complete mutations work
- [ ] Skip functionality works at step and wizard level
- [ ] Tour completion/skip tracked
- [ ] Progress persists between sessions
- [ ] Wizard navigates through all steps
- [ ] Form validation works on person forms
- [ ] Onboarding page redirects appropriately
- [ ] Keyboard navigation works (Tab/Enter)
- [ ] Type check passes
- [ ] Lint passes

---

*Created: 2026-01-13*
