import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConstellationPage from './page';

// Mock the ConstellationCanvas component
vi.mock('@/components/constellation-canvas', () => ({
  ConstellationCanvas: () => <div data-testid="constellation-canvas">Canvas Mock</div>,
}));

// Mock the AppShell component
vi.mock('@/components/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

describe('Constellation Page', () => {
  it('should render the page', () => {
    render(<ConstellationPage />);

    expect(screen.getByTestId('constellation-page')).toBeInTheDocument();
  });

  it('should include the AppShell', () => {
    render(<ConstellationPage />);

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  });

  it('should include the ConstellationCanvas', () => {
    render(<ConstellationPage />);

    expect(screen.getByTestId('constellation-canvas')).toBeInTheDocument();
  });

  it('should have full height layout', () => {
    render(<ConstellationPage />);

    const page = screen.getByTestId('constellation-page');
    expect(page).toHaveClass('h-screen');
  });
});
