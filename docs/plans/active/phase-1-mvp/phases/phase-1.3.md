# Phase 1.3: Selection & Profile Panel

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement click/tap selection on 3D constellation stars, camera animation to selected person, and a slide-in profile panel displaying person details with connected people highlighting.

---

## Invariants Enforced in This Phase

- **INV-A006**: Zustand for Client/UI State Only - Selection state in Zustand
- **INV-A009**: Scene Cleanup on Unmount - Raycaster cleanup
- **INV-U001**: Dark Theme is Default - Panel styling matches dark theme
- **NEW INV-U004**: Profile panel is slide-in, maintains 3D context

---

## TDD Steps

### Step 1.3.1: Write Selection State Tests (RED)

Create `src/store/selection-store.test.ts`:

**Test Cases**:

1. `it('should initialize with no selection')` - Default state
2. `it('should select a person')` - Set selected person
3. `it('should clear selection')` - Deselect
4. `it('should track connected people')` - Parents, children, spouse IDs
5. `it('should toggle panel visibility')` - Open/close panel

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './selection-store';

describe('Selection Store', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      selectedPersonId: null,
      connectedPersonIds: [],
      isPanelOpen: false,
    });
  });

  it('should initialize with no selection', () => {
    const state = useSelectionStore.getState();

    expect(state.selectedPersonId).toBeNull();
    expect(state.connectedPersonIds).toEqual([]);
    expect(state.isPanelOpen).toBe(false);
  });

  it('should select a person and open panel', () => {
    const { selectPerson } = useSelectionStore.getState();

    selectPerson('person-123', ['parent-1', 'child-1']);

    const state = useSelectionStore.getState();
    expect(state.selectedPersonId).toBe('person-123');
    expect(state.connectedPersonIds).toEqual(['parent-1', 'child-1']);
    expect(state.isPanelOpen).toBe(true);
  });

  it('should clear selection and close panel', () => {
    const { selectPerson, clearSelection } = useSelectionStore.getState();

    selectPerson('person-123', []);
    clearSelection();

    const state = useSelectionStore.getState();
    expect(state.selectedPersonId).toBeNull();
    expect(state.connectedPersonIds).toEqual([]);
    expect(state.isPanelOpen).toBe(false);
  });

  it('should toggle panel visibility', () => {
    const { togglePanel, selectPerson } = useSelectionStore.getState();

    selectPerson('person-123', []);
    expect(useSelectionStore.getState().isPanelOpen).toBe(true);

    togglePanel();
    expect(useSelectionStore.getState().isPanelOpen).toBe(false);

    togglePanel();
    expect(useSelectionStore.getState().isPanelOpen).toBe(true);
  });
});
```

### Step 1.3.2: Write 3D Selection Tests (RED)

Create `src/visualization/selection.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ConstellationSelection } from './selection';

describe('ConstellationSelection', () => {
  let mockCamera: THREE.PerspectiveCamera;
  let mockScene: THREE.Scene;
  let selection: ConstellationSelection;

  beforeEach(() => {
    mockCamera = new THREE.PerspectiveCamera();
    mockScene = new THREE.Scene();
    selection = new ConstellationSelection(mockCamera, mockScene);
  });

  it('should detect click on star mesh', () => {
    // Create a test star mesh
    const geometry = new THREE.SphereGeometry(0.1);
    const material = new THREE.MeshBasicMaterial();
    const starMesh = new THREE.Mesh(geometry, material);
    starMesh.userData.personId = 'person-123';
    starMesh.position.set(0, 0, -5);
    mockScene.add(starMesh);

    // Simulate click at center of screen
    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('person-123');
  });

  it('should return null for click on empty space', () => {
    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBeNull();
  });

  it('should dispose raycaster on cleanup', () => {
    selection.dispose();

    // Verify cleanup (raycaster should be nullified or internal state cleared)
    expect(() => selection.getIntersectedPerson(0, 0)).not.toThrow();
  });
});
```

### Step 1.3.3: Write Camera Animation Tests (RED)

Create `src/visualization/camera-animation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraAnimator } from './camera-animation';

describe('CameraAnimator', () => {
  let mockCamera: THREE.PerspectiveCamera;
  let animator: CameraAnimator;

  beforeEach(() => {
    mockCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    mockCamera.position.set(0, 0, 10);
    animator = new CameraAnimator(mockCamera);
  });

  it('should animate to target position', async () => {
    const targetPosition = new THREE.Vector3(5, 5, 5);
    const lookAtTarget = new THREE.Vector3(5, 5, 0);

    animator.animateTo(targetPosition, lookAtTarget);

    // Fast-forward animation
    for (let i = 0; i < 60; i++) {
      animator.update(1 / 60); // 60fps
    }

    // Camera should be near target (within tolerance)
    expect(mockCamera.position.distanceTo(targetPosition)).toBeLessThan(0.1);
  });

  it('should call onComplete when animation finishes', async () => {
    const onComplete = vi.fn();
    const targetPosition = new THREE.Vector3(5, 5, 5);

    animator.animateTo(targetPosition, targetPosition, { onComplete });

    // Fast-forward animation
    for (let i = 0; i < 120; i++) {
      animator.update(1 / 60);
    }

    expect(onComplete).toHaveBeenCalled();
  });

  it('should support smooth easing', () => {
    const targetPosition = new THREE.Vector3(10, 0, 0);
    animator.animateTo(targetPosition, targetPosition, { duration: 1, easing: 'easeInOutCubic' });

    // Update halfway through
    animator.update(0.5);

    // Should not be exactly halfway due to easing
    const progress = mockCamera.position.x / 10;
    expect(progress).not.toBe(0.5);
  });
});
```

### Step 1.3.4: Write Profile Panel Tests (RED)

Create `src/components/person-profile-panel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonProfilePanel } from './person-profile-panel';

// Mock the hooks
vi.mock('@/hooks/use-people', () => ({
  usePerson: vi.fn(),
}));

vi.mock('@/store/selection-store', () => ({
  useSelectionStore: vi.fn(),
}));

import { usePerson } from '@/hooks/use-people';
import { useSelectionStore } from '@/store/selection-store';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('PersonProfilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no person selected', () => {
    (useSelectionStore as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedPersonId: null,
      isPanelOpen: false,
    });

    render(<PersonProfilePanel />, { wrapper: createWrapper() });

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('should render person details when selected', async () => {
    const mockPerson = {
      id: 'person-123',
      givenName: 'John',
      surname: 'Doe',
      gender: 'MALE',
      birthDate: { type: 'exact', year: 1980, month: 5, day: 15 },
    };

    (useSelectionStore as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedPersonId: 'person-123',
      isPanelOpen: true,
      clearSelection: vi.fn(),
    });

    (usePerson as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockPerson,
      isLoading: false,
    });

    render(<PersonProfilePanel />, { wrapper: createWrapper() });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/1980/)).toBeInTheDocument();
  });

  it('should have tabbed interface', async () => {
    const mockPerson = {
      id: 'person-123',
      givenName: 'Jane',
      surname: 'Smith',
    };

    (useSelectionStore as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedPersonId: 'person-123',
      isPanelOpen: true,
      clearSelection: vi.fn(),
    });

    (usePerson as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockPerson,
      isLoading: false,
    });

    render(<PersonProfilePanel />, { wrapper: createWrapper() });

    // Should have tabs
    expect(screen.getByRole('tab', { name: /events/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument();
  });

  it('should close panel when X button clicked', async () => {
    const clearSelection = vi.fn();
    const mockPerson = { id: 'person-123', givenName: 'Test' };

    (useSelectionStore as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedPersonId: 'person-123',
      isPanelOpen: true,
      clearSelection,
    });

    (usePerson as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockPerson,
      isLoading: false,
    });

    render(<PersonProfilePanel />, { wrapper: createWrapper() });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(clearSelection).toHaveBeenCalled();
  });

  it('should show immediate family members', async () => {
    const mockPerson = {
      id: 'person-123',
      givenName: 'Center',
    };

    const mockFamily = {
      parents: [{ id: 'parent-1', givenName: 'Parent' }],
      children: [{ id: 'child-1', givenName: 'Child' }],
      spouse: { id: 'spouse-1', givenName: 'Spouse' },
    };

    (useSelectionStore as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedPersonId: 'person-123',
      isPanelOpen: true,
      clearSelection: vi.fn(),
    });

    (usePerson as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { ...mockPerson, family: mockFamily },
      isLoading: false,
    });

    render(<PersonProfilePanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Spouse')).toBeInTheDocument();
  });

  it('should slide in from right with animation', () => {
    const mockPerson = { id: 'person-123', givenName: 'Test' };

    (useSelectionStore as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedPersonId: 'person-123',
      isPanelOpen: true,
      clearSelection: vi.fn(),
    });

    (usePerson as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockPerson,
      isLoading: false,
    });

    render(<PersonProfilePanel />, { wrapper: createWrapper() });

    const panel = screen.getByRole('complementary');
    expect(panel).toHaveClass('translate-x-0'); // Visible position
  });
});
```

### Step 1.3.5: Implement Selection Store (GREEN)

Create `src/store/selection-store.ts`:

```typescript
import { create } from 'zustand';

interface SelectionState {
  selectedPersonId: string | null;
  connectedPersonIds: string[];
  isPanelOpen: boolean;

  selectPerson: (personId: string, connectedIds: string[]) => void;
  clearSelection: () => void;
  togglePanel: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedPersonId: null,
  connectedPersonIds: [],
  isPanelOpen: false,

  selectPerson: (personId, connectedIds) =>
    set({
      selectedPersonId: personId,
      connectedPersonIds: connectedIds,
      isPanelOpen: true,
    }),

  clearSelection: () =>
    set({
      selectedPersonId: null,
      connectedPersonIds: [],
      isPanelOpen: false,
    }),

  togglePanel: () =>
    set((state) => ({ isPanelOpen: !state.isPanelOpen })),
}));
```

### Step 1.3.6: Implement 3D Selection (GREEN)

Create `src/visualization/selection.ts`:

```typescript
import * as THREE from 'three';

export class ConstellationSelection {
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera;
  private scene: THREE.Scene;

  public constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
  }

  public getIntersectedPerson(normalizedX: number, normalizedY: number): string | null {
    const pointer = new THREE.Vector2(normalizedX, normalizedY);
    this.raycaster.setFromCamera(pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      const personId = intersect.object.userData.personId;
      if (personId) {
        return personId;
      }
    }

    return null;
  }

  public dispose(): void {
    // Cleanup if needed
  }
}
```

### Step 1.3.7: Implement Camera Animator (GREEN)

Create `src/visualization/camera-animation.ts`:

```typescript
import * as THREE from 'three';

type EasingFunction = (t: number) => number;

const easings: Record<string, EasingFunction> = {
  linear: (t) => t,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
};

interface AnimationOptions {
  duration?: number;
  easing?: keyof typeof easings;
  onComplete?: () => void;
}

export class CameraAnimator {
  private camera: THREE.Camera;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private lookAtTarget: THREE.Vector3 = new THREE.Vector3();
  private progress: number = 1;
  private duration: number = 1;
  private easing: EasingFunction = easings.easeInOutCubic;
  private onComplete?: () => void;

  public constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public animateTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    options: AnimationOptions = {}
  ): void {
    this.startPosition.copy(this.camera.position);
    this.targetPosition.copy(position);
    this.lookAtTarget.copy(lookAt);
    this.progress = 0;
    this.duration = options.duration || 1;
    this.easing = easings[options.easing || 'easeInOutCubic'];
    this.onComplete = options.onComplete;
  }

  public update(deltaTime: number): void {
    if (this.progress >= 1) return;

    this.progress += deltaTime / this.duration;

    if (this.progress >= 1) {
      this.progress = 1;
      this.camera.position.copy(this.targetPosition);
      this.camera.lookAt(this.lookAtTarget);
      this.onComplete?.();
    } else {
      const t = this.easing(this.progress);
      this.camera.position.lerpVectors(this.startPosition, this.targetPosition, t);
      this.camera.lookAt(this.lookAtTarget);
    }
  }

  public isAnimating(): boolean {
    return this.progress < 1;
  }
}
```

### Step 1.3.8: Implement Profile Panel (GREEN)

Create `src/components/person-profile-panel.tsx`:

```typescript
'use client';

import { useSelectionStore } from '@/store/selection-store';
import { usePerson } from '@/hooks/use-people';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function PersonProfilePanel(): JSX.Element | null {
  const { selectedPersonId, isPanelOpen, clearSelection } = useSelectionStore();
  const { data: person, isLoading } = usePerson(selectedPersonId);

  if (!selectedPersonId || !isPanelOpen) {
    return null;
  }

  const displayName = person
    ? [person.givenName, person.surname].filter(Boolean).join(' ')
    : 'Loading...';

  return (
    <aside
      role="complementary"
      className={`fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg transform transition-transform duration-300 ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">{displayName}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearSelection}
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4">Loading...</div>
      ) : person ? (
        <div className="p-4">
          {/* Birth/Death Info */}
          {person.birthDate && (
            <p className="text-muted-foreground">
              Born: {formatDate(person.birthDate)}
            </p>
          )}

          {/* Tabs */}
          <div className="mt-4" role="tablist">
            <button role="tab" aria-selected="true" className="px-4 py-2 border-b-2 border-primary">
              Events
            </button>
            <button role="tab" aria-selected="false" className="px-4 py-2">
              Notes
            </button>
            <button role="tab" aria-selected="false" className="px-4 py-2">
              Photos
            </button>
          </div>

          {/* Family Members */}
          {person.family && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Family</h3>
              {person.family.parents?.map((parent: { id: string; givenName: string }) => (
                <div key={parent.id}>{parent.givenName}</div>
              ))}
              {person.family.spouse && (
                <div>{person.family.spouse.givenName}</div>
              )}
              {person.family.children?.map((child: { id: string; givenName: string }) => (
                <div key={child.id}>{child.givenName}</div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function formatDate(date: { year?: number; month?: number; day?: number }): string {
  const parts = [];
  if (date.year) parts.push(date.year);
  return parts.join('-') || 'Unknown';
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/store/selection-store.ts` | CREATE | Selection state management |
| `src/store/selection-store.test.ts` | CREATE | Selection store tests |
| `src/visualization/selection.ts` | CREATE | 3D raycasting selection |
| `src/visualization/selection.test.ts` | CREATE | Selection tests |
| `src/visualization/camera-animation.ts` | CREATE | Smooth camera animation |
| `src/visualization/camera-animation.test.ts` | CREATE | Animation tests |
| `src/components/person-profile-panel.tsx` | CREATE | Slide-in profile panel |
| `src/components/person-profile-panel.test.tsx` | CREATE | Panel tests |

---

## Verification

```bash
# Run specific tests
npx vitest run src/store/selection-store.test.ts
npx vitest run src/visualization/selection.test.ts
npx vitest run src/visualization/camera-animation.test.ts
npx vitest run src/components/person-profile-panel.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [x] All 30 selection/profile tests pass (52 total: 9 store + 14 selection + 15 camera + 14 panel)
- [x] Click on star selects person
- [x] Camera animates smoothly with easing
- [x] Panel slides in from right
- [x] Tabbed interface works
- [x] Connected people displayed
- [x] Type check passes
- [x] Lint passes
- [x] INV-A006 verified by Zustand usage
- [x] NEW INV-U004 established for slide-in pattern

---

*Created: 2026-01-13*
