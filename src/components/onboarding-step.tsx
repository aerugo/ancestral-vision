/**
 * OnboardingStep Component
 *
 * A wrapper component for individual onboarding wizard steps.
 * Provides consistent layout with title, description, content, and action buttons.
 */
'use client';

import { type ReactElement, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface OnboardingStepProps {
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Step content */
  children: ReactNode;
  /** Handler for continue button */
  onContinue: () => void;
  /** Handler for skip button (optional) */
  onSkip?: () => void;
  /** Whether skip button should be shown */
  skippable?: boolean;
  /** Whether continue button should be disabled */
  continueDisabled?: boolean;
  /** Custom label for continue button */
  continueLabel?: string;
}

/**
 * OnboardingStep - Wrapper for wizard steps
 */
export function OnboardingStep({
  title,
  description,
  children,
  onContinue,
  onSkip,
  skippable = false,
  continueDisabled = false,
  continueLabel = 'Continue',
}: OnboardingStepProps): ReactElement {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex justify-between">
        {skippable && onSkip ? (
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={onContinue} disabled={continueDisabled}>
          {continueLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
