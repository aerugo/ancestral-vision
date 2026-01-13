import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Landing Page', () => {
  it('should render landing page with heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /ancestral vision/i
    );
  });

  it('should have call-to-action button', () => {
    render(<Home />);
    const ctaButton = screen.getByRole('link', { name: /get started/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/register');
  });

  it('should have link to sign in', () => {
    render(<Home />);
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('should display tagline', () => {
    render(<Home />);
    expect(
      screen.getByText(/transform your family tree/i)
    ).toBeInTheDocument();
  });
});
