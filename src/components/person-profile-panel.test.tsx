/**
 * PersonProfilePanel Tests (INV-U004: Slide-in Profile Panel)
 *
 * Tests for the slide-in profile panel component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { PersonProfilePanel } from './person-profile-panel';
import type { Relationship, ParentChildRelationship, SpouseRelationship } from '@/hooks/use-relationships';

// Mock the hooks
vi.mock('@/hooks/use-people', () => ({
  usePerson: vi.fn(),
}));

vi.mock('@/hooks/use-relationships', () => ({
  usePersonRelationships: vi.fn(),
}));

vi.mock('@/store/selection-store', () => ({
  useSelectionStore: vi.fn(),
}));

// Mock PersonMediaTab to avoid complex dependencies
vi.mock('./person-media-tab', () => ({
  PersonMediaTab: ({ personId }: { personId: string }) => (
    <div data-testid="person-media-tab">PersonMediaTab for {personId}</div>
  ),
}));

// Mock AddRelationshipDialog
vi.mock('./add-relationship-dialog', () => ({
  AddRelationshipDialog: ({
    personId,
    relationshipType,
    onClose,
  }: {
    personId: string;
    relationshipType: string;
    onClose: () => void;
  }) => (
    <div data-testid="add-relationship-dialog">
      Adding {relationshipType} for {personId}
      <button onClick={onClose}>Close Dialog</button>
    </div>
  ),
}));

import { usePerson } from '@/hooks/use-people';
import { usePersonRelationships } from '@/hooks/use-relationships';
import { useSelectionStore } from '@/store/selection-store';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Create a mock parent-child relationship
 */
function createParentChildRelationship(
  parentId: string,
  parentName: string,
  childId: string,
  childName: string
): ParentChildRelationship {
  return {
    id: `rel-${parentId}-${childId}`,
    parentId,
    childId,
    relationshipType: 'BIOLOGICAL',
    isPreferred: true,
    startDate: null,
    endDate: null,
    createdAt: new Date().toISOString(),
    parent: { id: parentId, givenName: parentName, surname: null },
    child: { id: childId, givenName: childName, surname: null },
  };
}

/**
 * Create a mock spouse relationship
 */
function createSpouseRelationship(
  person1Id: string,
  person1Name: string,
  person2Id: string,
  person2Name: string
): SpouseRelationship {
  return {
    id: `spouse-${person1Id}-${person2Id}`,
    person1Id,
    person2Id,
    marriageDate: null,
    marriagePlace: null,
    divorceDate: null,
    description: null,
    createdAt: new Date().toISOString(),
    person1: { id: person1Id, givenName: person1Name, surname: null },
    person2: { id: person2Id, givenName: person2Name, surname: null },
  };
}

describe('PersonProfilePanel', () => {
  const mockClearSelection = vi.fn();
  const mockTogglePanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for relationships - empty array
    vi.mocked(usePersonRelationships).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof usePersonRelationships>);
  });

  describe('Visibility', () => {
    it('should not render when no person selected', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: null,
        isPanelOpen: false,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('should not render when panel is closed', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: false,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('should render when person selected and panel open', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });
  });

  describe('Person Details', () => {
    it('should render person details when selected', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: {
          id: 'person-123',
          givenName: 'John',
          surname: 'Doe',
          generation: 0,
          patronymic: null,
          nameOrder: 'GIVEN_FIRST' as const,
          speculative: false,
          birthDate: '1980-05-15',
          deathDate: null,
        },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/1980/)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      // Should show loading text - getAllByText since there may be multiple
      const loadingElements = screen.getAllByText(/loading/i);
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should display only given name when no surname', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: {
          id: 'person-123',
          givenName: 'Madonna',
          surname: null,
          generation: 0,
          patronymic: null,
          nameOrder: 'GIVEN_FIRST' as const,
          speculative: false,
          birthDate: null,
          deathDate: null,
        },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByText('Madonna')).toBeInTheDocument();
    });
  });

  describe('Tabbed Interface', () => {
    it('should have tabbed interface with Events, Notes, Photos', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: {
          id: 'person-123',
          givenName: 'Jane',
          surname: 'Smith',
          generation: 0,
          patronymic: null,
          nameOrder: 'GIVEN_FIRST' as const,
          speculative: false,
          birthDate: null,
          deathDate: null,
        },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByRole('tab', { name: /events/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument();
    });

    it('should render PersonMediaTab when Photos tab is clicked', async () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: {
          id: 'person-123',
          givenName: 'Jane',
          surname: 'Smith',
          generation: 0,
          patronymic: null,
          nameOrder: 'GIVEN_FIRST' as const,
          speculative: false,
          birthDate: null,
          deathDate: null,
        },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      // Click on Photos tab
      await userEvent.click(screen.getByRole('tab', { name: /photos/i }));

      // Should render PersonMediaTab with correct personId
      expect(screen.getByTestId('person-media-tab')).toBeInTheDocument();
      expect(screen.getByText(/PersonMediaTab for person-123/)).toBeInTheDocument();
    });
  });

  describe('Close Panel', () => {
    it('should close panel when X button clicked', async () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('Family Members', () => {
    it('should show parents', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: ['parent-1'],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Center', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      // Mock relationship where person-123 is the child
      const relationships: Relationship[] = [
        createParentChildRelationship('parent-1', 'ParentName', 'person-123', 'Center'),
      ];

      vi.mocked(usePersonRelationships).mockReturnValue({
        data: relationships,
        isLoading: false,
      } as unknown as ReturnType<typeof usePersonRelationships>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByText('ParentName')).toBeInTheDocument();
    });

    it('should show children', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: ['child-1'],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Center', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      // Mock relationship where person-123 is the parent
      const relationships: Relationship[] = [
        createParentChildRelationship('person-123', 'Center', 'child-1', 'ChildName'),
      ];

      vi.mocked(usePersonRelationships).mockReturnValue({
        data: relationships,
        isLoading: false,
      } as unknown as ReturnType<typeof usePersonRelationships>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByText('ChildName')).toBeInTheDocument();
    });

    it('should show spouse', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: ['spouse-1'],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Center', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      // Mock spouse relationship
      const relationships: Relationship[] = [
        createSpouseRelationship('person-123', 'Center', 'spouse-1', 'SpouseName'),
      ];

      vi.mocked(usePersonRelationships).mockReturnValue({
        data: relationships,
        isLoading: false,
      } as unknown as ReturnType<typeof usePersonRelationships>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByText('SpouseName')).toBeInTheDocument();
    });
  });

  describe('Slide Animation (INV-U004)', () => {
    it('should slide in from right with animation class', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      const panel = screen.getByRole('complementary');
      expect(panel).toHaveClass('translate-x-0'); // Visible position
    });

    it('should have fixed positioning on right side', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      const panel = screen.getByRole('complementary');
      expect(panel).toHaveClass('fixed');
      expect(panel).toHaveClass('right-0');
    });
  });

  describe('Dark Theme Support (INV-U001)', () => {
    it('should use background color from theme', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      const panel = screen.getByRole('complementary');
      expect(panel).toHaveClass('bg-background');
    });
  });

  describe('Relationship Management', () => {
    it('should show Add Parent, Add Child, Add Spouse buttons', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /add parent/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add child/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add spouse/i })).toBeInTheDocument();
    });

    it('should open AddRelationshipDialog when Add Parent clicked', async () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /add parent/i }));

      expect(screen.getByTestId('add-relationship-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Adding parent for person-123/)).toBeInTheDocument();
    });

    it('should open AddRelationshipDialog when Add Child clicked', async () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /add child/i }));

      expect(screen.getByTestId('add-relationship-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Adding child for person-123/)).toBeInTheDocument();
    });

    it('should open AddRelationshipDialog when Add Spouse clicked', async () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      await userEvent.click(screen.getByRole('button', { name: /add spouse/i }));

      expect(screen.getByTestId('add-relationship-dialog')).toBeInTheDocument();
      expect(screen.getByText(/Adding spouse for person-123/)).toBeInTheDocument();
    });

    it('should close dialog when onClose is called', async () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        isPanelOpen: true,
        clearSelection: mockClearSelection,
        togglePanel: mockTogglePanel,
        connectedPersonIds: [],
      });

      vi.mocked(usePerson).mockReturnValue({
        data: { id: 'person-123', givenName: 'Test', surname: null, generation: 0, patronymic: null, nameOrder: 'GIVEN_FIRST', speculative: false, birthDate: null, deathDate: null },
        isLoading: false,
      } as ReturnType<typeof usePerson>);

      render(<PersonProfilePanel />, { wrapper: createWrapper() });

      // Open dialog
      await userEvent.click(screen.getByRole('button', { name: /add parent/i }));
      expect(screen.getByTestId('add-relationship-dialog')).toBeInTheDocument();

      // Close dialog
      await userEvent.click(screen.getByRole('button', { name: /close dialog/i }));
      expect(screen.queryByTestId('add-relationship-dialog')).not.toBeInTheDocument();
    });
  });
});
