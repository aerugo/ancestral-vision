/**
 * SearchBar Component Tests
 *
 * Tests for the global search bar with dropdown results.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from './search-bar';
import * as searchHooks from '@/hooks/use-search';

// Mock the search hooks
vi.mock('@/hooks/use-search');

// Mock scrollIntoView since JSDOM doesn't support it
Element.prototype.scrollIntoView = vi.fn();

const mockSearchResults = [
  {
    id: 'person-1',
    displayName: 'John Smith',
    givenName: 'John',
    surname: 'Smith',
    birthDate: { year: 1985 },
    similarity: 0.95,
  },
  {
    id: 'person-2',
    displayName: 'Jane Smith',
    givenName: 'Jane',
    surname: 'Smith',
    birthDate: { year: 1988 },
    similarity: 0.85,
  },
  {
    id: 'person-3',
    displayName: 'Jonathan Smithson',
    givenName: 'Jonathan',
    surname: 'Smithson',
    birthDate: null,
    similarity: 0.75,
  },
];

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
}

describe('SearchBar', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock - no results
    vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof searchHooks.useSearchPeople>);
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should show placeholder text', () => {
      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should show search icon', () => {
      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      // Search icon is rendered (Lucide icon has aria-hidden)
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Input Behavior', () => {
    it('should update input value on typing', async () => {
      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      expect(input).toHaveValue('Smith');
    });

    it('should show loading spinner when loading', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smi');

      // Should have loading spinner (animate-spin class on Loader2)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show clear button when query is not empty', async () => {
      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      expect(screen.getByLabelText(/clear/i)).toBeInTheDocument();
    });

    it('should clear input on clear button click', async () => {
      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');
      await userEvent.click(screen.getByLabelText(/clear/i));

      expect(input).toHaveValue('');
    });
  });

  describe('Results Dropdown', () => {
    it('should display results dropdown when results exist', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      // Text is split due to highlighting, so check for partial content
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should show no results message when empty', async () => {
      // Start with results, then type something that returns empty
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      // Type enough to trigger dropdown
      await userEvent.type(input, 'Xyz');

      // Dropdown should show "No results" message
      await waitFor(() => {
        expect(screen.getByText(/no results/i)).toBeInTheDocument();
      });
    });

    it('should show birth year for results with birthDate', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      expect(screen.getByText('b. 1985')).toBeInTheDocument();
      expect(screen.getByText('b. 1988')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when result is clicked', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      // Click the first option (John Smith)
      const options = screen.getAllByRole('option');
      await userEvent.click(options[0]);

      expect(mockOnSelect).toHaveBeenCalledWith('person-1');
    });

    it('should clear input after selection', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      // Click the first option
      const options = screen.getAllByRole('option');
      await userEvent.click(options[0]);

      expect(input).toHaveValue('');
    });

    it('should close dropdown after selection', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      // Click the first option
      const options = screen.getAllByRole('option');
      await userEvent.click(options[0]);

      // Listbox should be closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with ArrowDown', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');
      await userEvent.keyboard('{ArrowDown}');

      // First item should be highlighted
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate up with ArrowUp', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

      // First item should be highlighted (went down twice, up once)
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should select with Enter key', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');
      await userEvent.keyboard('{ArrowDown}{Enter}');

      expect(mockOnSelect).toHaveBeenCalledWith('person-1');
    });

    it('should close dropdown with Escape key', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have listbox role for results', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have option role for each result', async () => {
      vi.mocked(searchHooks.useSearchPeople).mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof searchHooks.useSearchPeople>);

      renderWithQueryClient(<SearchBar onSelect={mockOnSelect} />);

      const input = screen.getByRole('searchbox');
      await userEvent.type(input, 'Smith');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });
  });
});
