'use client';

/**
 * Constellation Page - Main 3D visualization view
 *
 * Integrates:
 * - ConstellationCanvas for 3D star rendering
 * - PersonProfilePanel for viewing/editing person details
 * - SearchBar via AppShell for finding people
 * - Onboarding redirect for new users
 * - Auth redirect for unauthenticated users
 */

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ConstellationCanvas } from '@/components/constellation-canvas';
import { PersonProfilePanel } from '@/components/person-profile-panel';
import { useSelectionStore } from '@/store/selection-store';
import { useAuth } from '@/components/providers/auth-provider';
import { useOnboarding } from '@/hooks/use-onboarding';

export default function ConstellationPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: onboarding, isLoading: onboardingLoading } = useOnboarding();
  const { selectedPersonId, isPanelOpen, selectPerson } = useSelectionStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!onboardingLoading && user) {
      const status = onboarding?.status;
      if (!status || status === 'NOT_STARTED' || status === 'IN_PROGRESS') {
        router.push('/onboarding');
      }
    }
  }, [onboarding, onboardingLoading, user, router]);

  // Handle person selection from search
  const handlePersonSelect = useCallback(
    (personId: string) => {
      selectPerson(personId, []);
    },
    [selectPerson]
  );

  return (
    <div data-testid="constellation-page" className="h-screen">
      <AppShell onPersonSelect={handlePersonSelect}>
        <ConstellationCanvas />
        {isPanelOpen && selectedPersonId && <PersonProfilePanel />}
      </AppShell>
    </div>
  );
}
