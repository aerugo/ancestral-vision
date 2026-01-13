/**
 * Onboarding Page
 *
 * First-run wizard for new users to create their initial family tree.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingWizard } from '@/components/onboarding-wizard';

export default function OnboardingPage(): React.ReactElement {
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

  // Handle wizard completion
  const handleComplete = () => {
    router.push('/constellation');
  };

  // Loading state
  if (authLoading || progressLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-testid="page-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!user) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-testid="page-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingWizard onComplete={handleComplete} />
    </div>
  );
}
