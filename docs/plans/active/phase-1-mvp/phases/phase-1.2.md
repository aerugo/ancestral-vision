# Phase 1.2: Person Enhancement

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Enhance person CRUD operations with form validation (Zod), auto-save functionality, contextual creation ("Add parent", "Add child", "Add spouse"), and international name support.

---

## Invariants Enforced in This Phase

- **INV-D001**: Person IDs are UUID v4
- **INV-D003**: Every Person belongs to exactly one Constellation
- **INV-S001**: All mutations require authentication
- **INV-U003**: Form Validation Uses Zod
- **NEW INV-A010**: Auto-save with debounce (2s) for inline editing

---

## TDD Steps

### Step 1.2.1: Write Failing Form Validation Tests (RED)

Create `src/components/person-form.test.tsx`:

**Test Cases**:

1. `it('should validate required givenName')` - Name is mandatory
2. `it('should accept valid person data')` - All optional fields work
3. `it('should display validation errors')` - Errors shown to user
4. `it('should handle international names')` - Patronymic, Eastern names
5. `it('should call onSubmit with valid data')` - Form submission
6. `it('should support inline editing mode')` - Edit existing person

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonForm } from './person-form';

describe('PersonForm', () => {
  describe('Validation', () => {
    it('should validate required givenName', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      // Try to submit without name
      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      // Should show error
      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid person data', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'John');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Doe');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'John',
            surname: 'Doe',
          })
        );
      });
    });

    it('should handle international names (patronymic)', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Ivan');
      await userEvent.type(screen.getByLabelText(/patronymic/i), 'Petrovich');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Sidorov');

      // Select Eastern/Patronymic name order
      await userEvent.selectOptions(screen.getByLabelText(/name order/i), 'PATRONYMIC');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Ivan',
            patronymic: 'Petrovich',
            surname: 'Sidorov',
            nameOrder: 'PATRONYMIC',
          })
        );
      });
    });

    it('should handle maiden names', async () => {
      const onSubmit = vi.fn();
      render(<PersonForm onSubmit={onSubmit} />);

      await userEvent.type(screen.getByLabelText(/given name/i), 'Maria');
      await userEvent.type(screen.getByLabelText(/surname/i), 'Smith');
      await userEvent.type(screen.getByLabelText(/maiden name/i), 'Johnson');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            givenName: 'Maria',
            surname: 'Smith',
            maidenName: 'Johnson',
          })
        );
      });
    });
  });

  describe('Edit Mode', () => {
    it('should populate fields with existing person data', () => {
      const existingPerson = {
        id: 'person-123',
        givenName: 'Jane',
        surname: 'Doe',
        gender: 'FEMALE',
      };

      render(<PersonForm person={existingPerson} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText(/given name/i)).toHaveValue('Jane');
      expect(screen.getByLabelText(/surname/i)).toHaveValue('Doe');
    });
  });
});
```

### Step 1.2.2: Write Auto-Save Tests (RED)

Create `src/hooks/use-auto-save.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce save calls by 2 seconds', async () => {
    const saveFn = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutoSave(saveFn, 2000));

    // Trigger multiple changes rapidly
    act(() => {
      result.current.triggerSave({ name: 'First' });
    });
    act(() => {
      result.current.triggerSave({ name: 'Second' });
    });
    act(() => {
      result.current.triggerSave({ name: 'Third' });
    });

    // Should not have called save yet
    expect(saveFn).not.toHaveBeenCalled();

    // Advance timers by 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Should have called save only once with last value
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith({ name: 'Third' });
  });

  it('should indicate saving state', async () => {
    const saveFn = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutoSave(saveFn, 2000));

    act(() => {
      result.current.triggerSave({ name: 'Test' });
    });

    // Should show pending state
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // After save completes, should not be pending
    expect(result.current.isPending).toBe(false);
  });

  it('should handle save errors gracefully', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() => useAutoSave(saveFn, 2000));

    act(() => {
      result.current.triggerSave({ name: 'Test' });
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.error).toBe('Save failed');
  });
});
```

### Step 1.2.3: Implement Zod Schema

Create `src/lib/schemas/person.ts`:

```typescript
import { z } from 'zod';

export const personFormSchema = z.object({
  givenName: z.string().min(1, 'Given name is required'),
  surname: z.string().optional(),
  maidenName: z.string().optional(),
  patronymic: z.string().optional(),
  matronymic: z.string().optional(),
  nickname: z.string().optional(),
  suffix: z.string().optional(),
  nameOrder: z.enum(['WESTERN', 'EASTERN', 'PATRONYMIC', 'PATRONYMIC_SUFFIX', 'MATRONYMIC']).default('WESTERN'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  birthDate: z.object({
    type: z.enum(['exact', 'approximate', 'range', 'before', 'after']),
    year: z.number().optional(),
    month: z.number().min(1).max(12).optional(),
    day: z.number().min(1).max(31).optional(),
    endYear: z.number().optional(), // For ranges
    isApproximate: z.boolean().optional(),
  }).optional(),
  deathDate: z.object({
    type: z.enum(['exact', 'approximate', 'range', 'before', 'after']),
    year: z.number().optional(),
    month: z.number().min(1).max(12).optional(),
    day: z.number().min(1).max(31).optional(),
    endYear: z.number().optional(),
    isApproximate: z.boolean().optional(),
  }).optional(),
  biography: z.string().max(50000, 'Biography cannot exceed 50,000 characters').optional(),
  speculative: z.boolean().default(false),
});

export type PersonFormData = z.infer<typeof personFormSchema>;
```

### Step 1.2.4: Implement PersonForm Component (GREEN)

Create `src/components/person-form.tsx`:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { personFormSchema, type PersonFormData } from '@/lib/schemas/person';

interface PersonFormProps {
  person?: Partial<PersonFormData> & { id?: string };
  onSubmit: (data: PersonFormData) => void;
  isLoading?: boolean;
}

export function PersonForm({ person, onSubmit, isLoading }: PersonFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personFormSchema),
    defaultValues: person || {
      nameOrder: 'WESTERN',
      speculative: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="givenName">Given Name *</Label>
        <Input
          id="givenName"
          {...register('givenName')}
          aria-invalid={!!errors.givenName}
        />
        {errors.givenName && (
          <p className="text-sm text-destructive">{errors.givenName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="surname">Surname</Label>
        <Input id="surname" {...register('surname')} />
      </div>

      <div>
        <Label htmlFor="maidenName">Maiden Name</Label>
        <Input id="maidenName" {...register('maidenName')} />
      </div>

      <div>
        <Label htmlFor="patronymic">Patronymic</Label>
        <Input id="patronymic" {...register('patronymic')} />
      </div>

      <div>
        <Label htmlFor="nameOrder">Name Order</Label>
        <select
          id="nameOrder"
          {...register('nameOrder')}
          className="w-full rounded-md border p-2"
        >
          <option value="WESTERN">Western (Given Surname)</option>
          <option value="EASTERN">Eastern (Surname Given)</option>
          <option value="PATRONYMIC">Patronymic (Given Patronymic Surname)</option>
          <option value="PATRONYMIC_SUFFIX">Patronymic Suffix</option>
          <option value="MATRONYMIC">Matronymic</option>
        </select>
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          {...register('gender')}
          className="w-full rounded-md border p-2"
        >
          <option value="">Select...</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

### Step 1.2.5: Implement useAutoSave Hook (GREEN)

Create `src/hooks/use-auto-save.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAutoSaveResult<T> {
  triggerSave: (data: T) => void;
  isPending: boolean;
  error: string | null;
  lastSavedAt: Date | null;
}

export function useAutoSave<T>(
  saveFn: (data: T) => Promise<void>,
  debounceMs: number = 2000
): UseAutoSaveResult<T> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T | null>(null);

  const triggerSave = useCallback(
    (data: T) => {
      latestDataRef.current = data;
      setIsPending(true);
      setError(null);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          await saveFn(latestDataRef.current!);
          setLastSavedAt(new Date());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
          setIsPending(false);
        }
      }, debounceMs);
    },
    [saveFn, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { triggerSave, isPending, error, lastSavedAt };
}
```

### Step 1.2.6: Write Contextual Creation Tests (RED)

Add to `src/components/person-form.test.tsx`:

```typescript
describe('Contextual Creation', () => {
  it('should show "Add Parent" context when creating parent', () => {
    render(
      <PersonForm
        context={{ type: 'parent', relativeTo: { id: 'child-id', givenName: 'Child' } }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/add parent of child/i)).toBeInTheDocument();
  });

  it('should show "Add Child" context when creating child', () => {
    render(
      <PersonForm
        context={{ type: 'child', relativeTo: { id: 'parent-id', givenName: 'Parent' } }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/add child of parent/i)).toBeInTheDocument();
  });

  it('should show "Add Spouse" context when creating spouse', () => {
    render(
      <PersonForm
        context={{ type: 'spouse', relativeTo: { id: 'person-id', givenName: 'Person' } }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/add spouse of person/i)).toBeInTheDocument();
  });
});
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/schemas/person.ts` | CREATE | Zod validation schema |
| `src/components/person-form.tsx` | CREATE | Person form component |
| `src/components/person-form.test.tsx` | CREATE | Form component tests |
| `src/hooks/use-auto-save.ts` | CREATE | Auto-save debounce hook |
| `src/hooks/use-auto-save.test.ts` | CREATE | Auto-save tests |

---

## Verification

```bash
# Run specific tests
npx vitest run src/components/person-form.test.tsx
npx vitest run src/hooks/use-auto-save.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All 20 person enhancement tests pass
- [ ] Zod validation prevents invalid submissions
- [ ] Auto-save triggers after 2s debounce
- [ ] Contextual creation shows appropriate context
- [ ] International names fully supported
- [ ] Type check passes
- [ ] Lint passes
- [ ] INV-U003 verified by Zod usage
- [ ] NEW INV-A010 established for auto-save pattern

---

*Created: 2026-01-13*
