/**
 * Selection Store Tests (INV-A006: Zustand for Client/UI State)
 *
 * Tests for the selection state management store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './selection-store';

describe('Selection Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSelectionStore.setState({
      selectedPersonId: null,
      connectedPersonIds: [],
      isPanelOpen: false,
    });
  });

  describe('Initial State', () => {
    it('should initialize with no selection', () => {
      const state = useSelectionStore.getState();

      expect(state.selectedPersonId).toBeNull();
      expect(state.connectedPersonIds).toEqual([]);
      expect(state.isPanelOpen).toBe(false);
    });
  });

  describe('selectPerson', () => {
    it('should select a person and open panel', () => {
      const { selectPerson } = useSelectionStore.getState();

      selectPerson('person-123', ['parent-1', 'child-1']);

      const state = useSelectionStore.getState();
      expect(state.selectedPersonId).toBe('person-123');
      expect(state.connectedPersonIds).toEqual(['parent-1', 'child-1']);
      expect(state.isPanelOpen).toBe(true);
    });

    it('should replace previous selection', () => {
      const { selectPerson } = useSelectionStore.getState();

      selectPerson('person-1', ['conn-1']);
      selectPerson('person-2', ['conn-2', 'conn-3']);

      const state = useSelectionStore.getState();
      expect(state.selectedPersonId).toBe('person-2');
      expect(state.connectedPersonIds).toEqual(['conn-2', 'conn-3']);
    });

    it('should allow empty connected IDs', () => {
      const { selectPerson } = useSelectionStore.getState();

      selectPerson('person-123', []);

      const state = useSelectionStore.getState();
      expect(state.selectedPersonId).toBe('person-123');
      expect(state.connectedPersonIds).toEqual([]);
      expect(state.isPanelOpen).toBe(true);
    });
  });

  describe('clearSelection', () => {
    it('should clear selection and close panel', () => {
      const { selectPerson, clearSelection } = useSelectionStore.getState();

      selectPerson('person-123', ['parent-1']);
      clearSelection();

      const state = useSelectionStore.getState();
      expect(state.selectedPersonId).toBeNull();
      expect(state.connectedPersonIds).toEqual([]);
      expect(state.isPanelOpen).toBe(false);
    });

    it('should be idempotent when already cleared', () => {
      const { clearSelection } = useSelectionStore.getState();

      clearSelection();
      clearSelection();

      const state = useSelectionStore.getState();
      expect(state.selectedPersonId).toBeNull();
      expect(state.isPanelOpen).toBe(false);
    });
  });

  describe('togglePanel', () => {
    it('should toggle panel visibility', () => {
      const { togglePanel, selectPerson } = useSelectionStore.getState();

      selectPerson('person-123', []);
      expect(useSelectionStore.getState().isPanelOpen).toBe(true);

      togglePanel();
      expect(useSelectionStore.getState().isPanelOpen).toBe(false);

      togglePanel();
      expect(useSelectionStore.getState().isPanelOpen).toBe(true);
    });

    it('should toggle even without selection', () => {
      const { togglePanel } = useSelectionStore.getState();

      expect(useSelectionStore.getState().isPanelOpen).toBe(false);

      togglePanel();
      expect(useSelectionStore.getState().isPanelOpen).toBe(true);

      togglePanel();
      expect(useSelectionStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe('setConnectedPersonIds', () => {
    it('should update connected person IDs independently', () => {
      const { selectPerson, setConnectedPersonIds } = useSelectionStore.getState();

      selectPerson('person-123', ['old-1']);
      setConnectedPersonIds(['new-1', 'new-2', 'new-3']);

      const state = useSelectionStore.getState();
      expect(state.selectedPersonId).toBe('person-123');
      expect(state.connectedPersonIds).toEqual(['new-1', 'new-2', 'new-3']);
    });
  });
});
