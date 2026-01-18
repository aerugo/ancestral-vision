/**
 * Development Shortcuts Hook
 *
 * React hook for development shortcuts in template mode.
 * Provides keyboard shortcuts for testing and development.
 *
 * SECURITY: Only active in template mode (development environment).
 */
'use client';

import { useEffect, useCallback } from 'react';
import { devShortcuts, DEV_SHORTCUT_KEYS } from '@/lib/dev-shortcuts';
import { isTemplateMode } from '@/lib/template-mode';
import { useSelectionStore } from '@/store/selection-store';
import { useUpdatePerson, usePerson } from '@/hooks/use-people';
import { biographyTransitionEvents } from '@/visualization/biography-transition-events';

/**
 * Placeholder biography for testing
 */
const PLACEHOLDER_BIOGRAPHY = `This is a test biography added via dev shortcuts.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

/**
 * Hook to enable development shortcuts for constellation testing
 *
 * Shortcuts:
 * - B: Toggle biography on selected node
 * - ?: Show available shortcuts
 */
export function useDevShortcuts(): void {
  const selectedPersonId = useSelectionStore((state) => state.selectedPersonId);
  const updatePerson = useUpdatePerson();

  // Get the selected person data to check if they have a biography
  const { data: selectedPerson } = usePerson(selectedPersonId ?? '');

  // Toggle biography handler
  const toggleBiography = useCallback(() => {
    if (!selectedPersonId || !selectedPerson) {
      return;
    }

    const hasBiography = Boolean(selectedPerson.biography?.trim());

    if (hasBiography) {
      // Remove biography - trigger reverse animation first
      // Emit transition event BEFORE mutation to capture biography node position
      biographyTransitionEvents.emit(selectedPersonId, 'remove');
      updatePerson.mutate({
        id: selectedPersonId,
        input: { biography: null },
      });
    } else {
      // Add placeholder biography - trigger animation first
      // Emit transition event BEFORE mutation to capture ghost node position
      biographyTransitionEvents.emit(selectedPersonId, 'add');
      updatePerson.mutate({
        id: selectedPersonId,
        input: { biography: PLACEHOLDER_BIOGRAPHY },
      });
    }
  }, [selectedPersonId, selectedPerson, updatePerson]);

  // Initialize shortcuts on mount
  useEffect(() => {
    // Only in template mode
    if (!isTemplateMode()) {
      return;
    }

    // Initialize the shortcuts system
    devShortcuts.init();

    // Register the toggle biography shortcut
    devShortcuts.register({
      key: DEV_SHORTCUT_KEYS.TOGGLE_BIOGRAPHY,
      description: 'Toggle biography on selected node',
      handler: toggleBiography,
    });

    // Cleanup on unmount
    return () => {
      devShortcuts.unregister(DEV_SHORTCUT_KEYS.TOGGLE_BIOGRAPHY);
    };
  }, [toggleBiography]);
}

/**
 * Component wrapper for development shortcuts
 * Add this to your layout to enable shortcuts
 */
export function DevShortcutsProvider(): null {
  useDevShortcuts();
  return null;
}
