import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { QueryProvider } from './query-provider';

// Test component that uses React Query
function TestComponent() {
  const { isLoading, data } = useQuery({
    queryKey: ['test'],
    queryFn: async () => 'test-data',
  });

  if (isLoading) return <div>Loading...</div>;
  return <div data-testid="result">{data}</div>;
}

describe('QueryProvider', () => {
  it('should render children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should provide QueryClient context to children', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Wait for query to complete
    const result = await screen.findByTestId('result');
    expect(result).toHaveTextContent('test-data');
  });

  it('should handle multiple children', () => {
    render(
      <QueryProvider>
        <div data-testid="first">First</div>
        <div data-testid="second">Second</div>
      </QueryProvider>
    );

    expect(screen.getByTestId('first')).toBeInTheDocument();
    expect(screen.getByTestId('second')).toBeInTheDocument();
  });
});
