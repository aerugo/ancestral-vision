import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonNotesTab } from './person-notes-tab';
import type { Note, NoteVersion } from '@/hooks/use-notes';

// Mock the hooks
vi.mock('@/hooks/use-notes', () => ({
  usePersonNotes: vi.fn(),
  useCreateNote: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateNote: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useDeleteNote: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock child components to isolate testing
vi.mock('./note-editor', () => ({
  NoteEditor: ({
    onSave,
    onTitleChange,
    onClose,
  }: {
    onSave: (content: string) => void;
    onTitleChange: (title: string) => void;
    onPrivacyChange: (privacy: string) => void;
    onClose?: () => void;
    initialTitle?: string;
    initialContent?: string;
    initialPrivacy?: string;
  }) => (
    <div data-testid="note-editor">
      <input
        placeholder="Untitled Note"
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="title"
      />
      <div role="textbox" data-testid="editor-content" />
      <button onClick={onClose} aria-label="Back">
        Back
      </button>
      <button onClick={() => onSave('content')}>Save</button>
    </div>
  ),
}));

vi.mock('./note-version-history', () => ({
  NoteVersionHistory: ({
    onClose,
    onRestore,
  }: {
    currentVersion: number;
    previousVersions: NoteVersion[];
    onRestore: (version: NoteVersion) => void;
    onClose: () => void;
  }) => (
    <div data-testid="version-history">
      <button onClick={onClose} aria-label="Close">
        Close
      </button>
      <button
        onClick={() =>
          onRestore({ version: 1, content: 'old', updatedAt: '2026-01-01' })
        }
      >
        Restore
      </button>
    </div>
  ),
}));

import {
  usePersonNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '@/hooks/use-notes';

const mockNotes: Note[] = [
  {
    id: 'note-1',
    personId: 'person-1',
    title: 'Childhood Memories',
    content: '{"type":"doc","content":[]}',
    privacy: 'PRIVATE',
    version: 2,
    previousVersions: [
      { version: 1, content: '...', updatedAt: '2026-01-12T00:00:00Z' },
    ],
    referencedPersonIds: [],
    deletedAt: null,
    createdAt: '2026-01-11T00:00:00Z',
    updatedAt: '2026-01-13T00:00:00Z',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('PersonNotesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePersonNotes).mockReturnValue({
      data: mockNotes,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePersonNotes>);
  });

  it('should render notes list', () => {
    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Childhood Memories')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(usePersonNotes).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePersonNotes>);

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state', () => {
    vi.mocked(usePersonNotes).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePersonNotes>);

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/no notes/i)).toBeInTheDocument();
  });

  it('should open editor when note clicked', async () => {
    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Childhood Memories'));

    // Editor should be visible
    expect(screen.getByTestId('note-editor')).toBeInTheDocument();
  });

  it('should create new note', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-note',
      personId: 'person-1',
      title: null,
      content: '{"type":"doc","content":[]}',
      privacy: 'PRIVATE',
      version: 1,
      previousVersions: null,
      referencedPersonIds: [],
      deletedAt: null,
      createdAt: '2026-01-13T00:00:00Z',
      updatedAt: '2026-01-13T00:00:00Z',
    });
    vi.mocked(useCreateNote).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateNote>);

    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /add note/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('should update note', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateNote).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateNote>);

    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    // Open editor
    await user.click(screen.getByText('Childhood Memories'));

    // Type in title
    const titleInput = screen.getByPlaceholderText(/untitled/i);
    await user.type(titleInput, 'Updated Title');

    // Save should be called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('should delete note with confirmation', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useDeleteNote).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteNote>);

    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    // Open note
    await user.click(screen.getByText('Childhood Memories'));

    // Click delete
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // Confirm
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockMutate).toHaveBeenCalledWith('note-1');
  });

  it('should show version history button', async () => {
    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    // Open note
    await user.click(screen.getByText('Childhood Memories'));

    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
  });

  it('should handle save errors', async () => {
    vi.mocked(useUpdateNote).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockRejectedValue(new Error('Save failed')),
      isPending: false,
      isError: true,
      error: new Error('Save failed'),
    } as unknown as ReturnType<typeof useUpdateNote>);

    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Childhood Memories'));

    // Trigger a save by typing
    const titleInput = screen.getByPlaceholderText(/untitled/i);
    await user.type(titleInput, 'x');

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('should close editor on back button', async () => {
    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    // Open editor
    await user.click(screen.getByText('Childhood Memories'));
    expect(screen.getByTestId('note-editor')).toBeInTheDocument();

    // Click back
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Should be back to list
    await waitFor(() => {
      expect(screen.queryByTestId('note-editor')).not.toBeInTheDocument();
    });
  });
});
