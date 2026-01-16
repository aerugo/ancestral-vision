/**
 * Selection Store (INV-A006: Zustand for Client/UI State)
 *
 * Manages selection state for the 3D constellation.
 * Tracks selected person, connected people, and panel visibility.
 */
import { create } from 'zustand';

/**
 * Selection state interface
 */
interface SelectionState {
  /** Currently selected person ID */
  selectedPersonId: string | null;
  /** Previously selected person ID (for pulse animation between selections) */
  previousSelectedPersonId: string | null;
  /** IDs of people connected to the selected person (parents, children, spouses) */
  connectedPersonIds: string[];
  /** Whether the profile panel is open */
  isPanelOpen: boolean;

  /** Select a person and their connected people */
  selectPerson: (personId: string, connectedIds: string[]) => void;
  /** Clear the current selection */
  clearSelection: () => void;
  /** Toggle the profile panel visibility */
  togglePanel: () => void;
  /** Update connected person IDs */
  setConnectedPersonIds: (ids: string[]) => void;
}

/**
 * Selection store using Zustand
 */
export const useSelectionStore = create<SelectionState>((set) => ({
  selectedPersonId: null,
  previousSelectedPersonId: null,
  connectedPersonIds: [],
  isPanelOpen: false,

  selectPerson: (personId, connectedIds) =>
    set((state) => ({
      previousSelectedPersonId: state.selectedPersonId,
      selectedPersonId: personId,
      connectedPersonIds: connectedIds,
      isPanelOpen: true,
    })),

  clearSelection: () =>
    set({
      selectedPersonId: null,
      previousSelectedPersonId: null,
      connectedPersonIds: [],
      isPanelOpen: false,
    }),

  togglePanel: () =>
    set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  setConnectedPersonIds: (ids) =>
    set({ connectedPersonIds: ids }),
}));
