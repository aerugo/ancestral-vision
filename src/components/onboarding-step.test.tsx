/**
 * OnboardingStep Component Tests
 *
 * Tests for the step wrapper component used in onboarding wizard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingStep } from './onboarding-step';

describe('OnboardingStep', () => {
  const mockOnContinue = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step title', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('should render step description', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started with your family tree"
        onContinue={mockOnContinue}
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.getByText('Get started with your family tree')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
      >
        <div data-testid="step-content">Step content here</div>
      </OnboardingStep>
    );

    expect(screen.getByTestId('step-content')).toBeInTheDocument();
    expect(screen.getByText('Step content here')).toBeInTheDocument();
  });

  it('should render continue button', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should call onContinue when continue button clicked', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
      >
        <div>Content</div>
      </OnboardingStep>
    );

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('should render skip button when skippable', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
        onSkip={mockOnSkip}
        skippable
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('should not render skip button when not skippable', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('should call onSkip when skip button clicked', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
        onSkip={mockOnSkip}
        skippable
      >
        <div>Content</div>
      </OnboardingStep>
    );

    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('should disable continue button when continueDisabled is true', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
        continueDisabled
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('should use custom continue label', () => {
    render(
      <OnboardingStep
        title="Welcome"
        description="Get started"
        onContinue={mockOnContinue}
        continueLabel="View Constellation"
      >
        <div>Content</div>
      </OnboardingStep>
    );

    expect(screen.getByRole('button', { name: /view constellation/i })).toBeInTheDocument();
  });
});
