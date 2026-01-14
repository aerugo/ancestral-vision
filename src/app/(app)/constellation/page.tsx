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
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ConstellationCanvas } from '@/components/constellation-canvas';
import { PersonProfilePanel } from '@/components/person-profile-panel';
import { useSelectionStore } from '@/store/selection-store';
import { useAuth } from '@/components/providers/auth-provider';
import { useOnboarding } from '@/hooks/use-onboarding';

export default function ConstellationPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: onboarding, isPending: onboardingPending } = useOnboarding();
  const { selectedPersonId, isPanelOpen, selectPerson } = useSelectionStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!onboardingPending && user) {
      const status = onboarding?.status;
      if (!status || status === 'NOT_STARTED' || status === 'IN_PROGRESS') {
        router.push('/onboarding');
      }
    }
  }, [onboarding, onboardingPending, user, router]);

  // Handle person selection from search
  const handlePersonSelect = useCallback(
    (personId: string) => {
      selectPerson(personId, []);
    },
    [selectPerson]
  );

  // Show loading state while auth or onboarding status is being determined
  // This prevents showing placeholder constellation before we know if user needs onboarding
  if (authLoading || onboardingPending) {
    return (
      <div
        data-testid="constellation-page-loading"
        className="h-screen flex items-center justify-center"
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not authenticated - will redirect (show loading while redirect happens)
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if onboarding is needed - redirect will happen via useEffect
  const status = onboarding?.status;
  if (!status || status === 'NOT_STARTED' || status === 'IN_PROGRESS') {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="constellation-page" className="h-screen">
      <AppShell onPersonSelect={handlePersonSelect}>
        <ConstellationCanvas />
        {isPanelOpen && selectedPersonId && <PersonProfilePanel />}
      </AppShell>
    </div>
  );
}
