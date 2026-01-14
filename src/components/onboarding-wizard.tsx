/**
 * OnboardingWizard Component
 *
 * A multi-step wizard for new user onboarding.
 * Guides users through creating their initial family tree.
 */
'use client';

import { useState, useCallback, type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { OnboardingStep } from './onboarding-step';
import { PersonQuickForm, type PersonQuickFormData } from './person-quick-form';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useOnboarding,
  useCompleteTour,
  useSkipTour,
  useUpdateOnboardingStep,
  useCompleteOnboardingStep,
  useCompleteOnboarding,
  useSkipOnboarding,
  type OnboardingStep as StepType,
} from '@/hooks/use-onboarding';
import { triggerCameraReveal } from '@/hooks/use-camera-reveal';

interface OnboardingWizardProps {
  /** Callback when onboarding is complete or skipped */
  onComplete: () => void;
}

const STEPS: StepType[] = ['TOUR', 'ADD_SELF', 'ADD_PARENTS', 'ADD_GRANDPARENTS', 'AHA_MOMENT'];

/**
 * OnboardingWizard - Multi-step onboarding flow
 */
export function OnboardingWizard({ onComplete }: OnboardingWizardProps): ReactElement {
  const { data: progress, isPending } = useOnboarding();
  const completeTour = useCompleteTour();
  const skipTour = useSkipTour();
  const updateStep = useUpdateOnboardingStep();
  const completeStep = useCompleteOnboardingStep();
  const complete = useCompleteOnboarding();
  const skip = useSkipOnboarding();

  // Form state for each step
  const [selfData, setSelfData] = useState<PersonQuickFormData>({ givenName: '', surname: '' });
  const [fatherData, setFatherData] = useState<PersonQuickFormData>({ givenName: '', surname: '' });
  const [motherData, setMotherData] = useState<PersonQuickFormData>({ givenName: '', surname: '' });
  const [grandparentsData, setGrandparentsData] = useState<Record<string, PersonQuickFormData>>({});

  // Calculate progress
  const currentStepIndex = progress ? STEPS.indexOf(progress.currentStep) : 0;
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Handle continue from each step
  const handleContinue = useCallback(async () => {
    if (!progress) return;

    const currentStep = progress.currentStep;

    try {
      if (currentStep === 'TOUR') {
        await completeTour.mutateAsync();
      } else if (currentStep === 'AHA_MOMENT') {
        await complete.mutateAsync();
        // Trigger camera reveal animation on constellation page
        triggerCameraReveal();
        onComplete();
      } else {
        // Get data for current step
        let stepData: unknown = null;
        if (currentStep === 'ADD_SELF') {
          stepData = selfData;
        } else if (currentStep === 'ADD_PARENTS') {
          stepData = { father: fatherData, mother: motherData };
        } else if (currentStep === 'ADD_GRANDPARENTS') {
          stepData = grandparentsData;
        }

        // Complete current step
        await completeStep.mutateAsync({ step: currentStep, data: stepData });

        // Move to next step
        const nextIndex = STEPS.indexOf(currentStep) + 1;
        const nextStep = STEPS[nextIndex];
        if (nextStep) {
          await updateStep.mutateAsync({ step: nextStep });
        }
      }
    } catch (error) {
      console.error('Error progressing onboarding:', error);
    }
  }, [
    progress,
    completeTour,
    complete,
    completeStep,
    updateStep,
    selfData,
    fatherData,
    motherData,
    grandparentsData,
    onComplete,
  ]);

  // Handle skip step
  const handleSkipStep = useCallback(async () => {
    if (!progress) return;

    const currentStep = progress.currentStep;

    try {
      if (currentStep === 'TOUR') {
        await skipTour.mutateAsync();
      } else {
        const nextIndex = STEPS.indexOf(currentStep) + 1;
        const nextStep = STEPS[nextIndex];
        if (nextStep) {
          await updateStep.mutateAsync({ step: nextStep });
        }
      }
    } catch (error) {
      console.error('Error skipping step:', error);
    }
  }, [progress, skipTour, updateStep]);

  // Handle skip all
  const handleSkipAll = useCallback(async () => {
    try {
      await skip.mutateAsync();
      onComplete();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  }, [skip, onComplete]);

  // Handle grandparent form changes
  const handleGrandparentChange = useCallback((key: string, data: PersonQuickFormData) => {
    setGrandparentsData((prev) => ({ ...prev, [key]: data }));
  }, []);

  // Loading state - show spinner until we have progress data
  // The onboardingProgress query auto-creates the record if it doesn't exist
  if (isPending || !progress) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  // Render current step content
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
            <div className="text-center space-y-4 py-4">
              <p className="text-muted-foreground">
                Each person in your family tree becomes a star in your personal constellation.
              </p>
              <p className="text-muted-foreground">
                Watch your constellation grow as you add ancestors and their stories.
              </p>
            </div>
          </OnboardingStep>
        );

      case 'ADD_SELF':
        return (
          <OnboardingStep
            title="Start with yourself"
            description="Add yourself as the first star in your constellation."
            onContinue={handleContinue}
            continueDisabled={!selfData.givenName.trim()}
          >
            <PersonQuickForm
              key="self"
              label="You"
              onChange={setSelfData}
              initialValues={selfData}
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
              <PersonQuickForm
                key="parent-father"
                label="Father"
                onChange={setFatherData}
                initialValues={fatherData}
              />
              <PersonQuickForm
                key="parent-mother"
                label="Mother"
                onChange={setMotherData}
                initialValues={motherData}
              />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PersonQuickForm
                key="grandparent-paternal-grandfather"
                label="Paternal Grandfather"
                onChange={(data) => handleGrandparentChange('paternalGrandfather', data)}
                initialValues={grandparentsData.paternalGrandfather}
                compact
              />
              <PersonQuickForm
                key="grandparent-paternal-grandmother"
                label="Paternal Grandmother"
                onChange={(data) => handleGrandparentChange('paternalGrandmother', data)}
                initialValues={grandparentsData.paternalGrandmother}
                compact
              />
              <PersonQuickForm
                key="grandparent-maternal-grandfather"
                label="Maternal Grandfather"
                onChange={(data) => handleGrandparentChange('maternalGrandfather', data)}
                initialValues={grandparentsData.maternalGrandfather}
                compact
              />
              <PersonQuickForm
                key="grandparent-maternal-grandmother"
                label="Maternal Grandmother"
                onChange={(data) => handleGrandparentChange('maternalGrandmother', data)}
                initialValues={grandparentsData.maternalGrandmother}
                compact
              />
            </div>
          </OnboardingStep>
        );

      case 'AHA_MOMENT':
        return (
          <OnboardingStep
            title="Your constellation awaits"
            description="See your family tree come to life as a constellation of stars."
            onContinue={handleContinue}
            continueLabel="View My Constellation"
          >
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                Click below to reveal your family constellation and begin exploring your heritage.
              </p>
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
