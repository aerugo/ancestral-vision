# Phase 1.4b: Notes UI Completion

**Status**: Pending
**Started**:
**Completed**:
**Parent Plan**: [phase-1.4.md](phase-1.4.md)

---

## Objective

Complete the remaining UI components for the Notes System that were not implemented in Phase 1.4:
- Tiptap rich text editor with formatting toolbar
- Version history component with restore functionality
- Profile panel integration with Notes tab

---

## Prerequisites

Phase 1.4 backend is complete:
- GraphQL schema with Note types
- Note resolvers (CRUD + version history)
- TanStack Query hooks (usePersonNotes, useCreateNote, useUpdateNote, useDeleteNote)
- NoteList component (display only)

---

## Invariants Enforced

- **INV-A005**: TanStack Query for Server State
- **INV-A010**: Auto-save with 2s debounce for inline editing
- **INV-U001**: Responsive design with dark theme support
- **INV-U003**: Form Validation Uses Zod (for title validation)

---

## TDD Steps

### Step 1.4b.1: Write Note Editor Tests (RED)

Create `src/components/note-editor.test.tsx`:

**Test Cases** (12 tests):

1. `it('should render editor container')` - Basic mount
2. `it('should display existing content')` - Load initial content
3. `it('should show title input field')` - Title editing
4. `it('should show privacy selector')` - Privacy dropdown
5. `it('should show formatting toolbar')` - Toolbar visible
6. `it('should support bold formatting')` - Bold button click
7. `it('should support italic formatting')` - Italic button click
8. `it('should support heading formatting')` - Heading buttons
9. `it('should support bullet lists')` - Bullet list button
10. `it('should support numbered lists')` - Ordered list button
11. `it('should show character count')` - Character counter display
12. `it('should call onSave after debounce')` - Auto-save callback

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from './note-editor';

// Mock Tiptap - it doesn't work well in JSDOM
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleHeading: () => ({ run: vi.fn() }),
        toggleBulletList: () => ({ run: vi.fn() }),
        toggleOrderedList: () => ({ run: vi.fn() }),
      }),
    }),
    isActive: vi.fn(() => false),
    getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    getText: vi.fn(() => ''),
    storage: {
      characterCount: {
        characters: () => 0,
      },
    },
    commands: {
      setContent: vi.fn(),
    },
  })),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" role="textbox" />
  ),
}));

describe('NoteEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnTitleChange = vi.fn();
  const mockOnPrivacyChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render editor container', () => {
    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('should display existing content', () => {
    const initialContent = '{"type":"doc","content":[]}';

    render(
      <NoteEditor
        initialContent={initialContent}
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('should show title input field', () => {
    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    expect(screen.getByPlaceholderText(/untitled/i)).toBeInTheDocument();
  });

  it('should show privacy selector', () => {
    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    expect(screen.getByRole('combobox', { name: /privacy/i })).toBeInTheDocument();
  });

  it('should show formatting toolbar', () => {
    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
  });

  it('should support bold formatting', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const boldButton = screen.getByRole('button', { name: /bold/i });
    await user.click(boldButton);

    // Button should be clickable (no error thrown)
    expect(boldButton).toBeInTheDocument();
  });

  it('should support italic formatting', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const italicButton = screen.getByRole('button', { name: /italic/i });
    await user.click(italicButton);

    expect(italicButton).toBeInTheDocument();
  });

  it('should support heading formatting', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const h1Button = screen.getByRole('button', { name: /heading 1/i });
    await user.click(h1Button);

    expect(h1Button).toBeInTheDocument();
  });

  it('should support bullet lists', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const bulletButton = screen.getByRole('button', { name: /bullet list/i });
    await user.click(bulletButton);

    expect(bulletButton).toBeInTheDocument();
  });

  it('should support numbered lists', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const numberedButton = screen.getByRole('button', { name: /numbered list/i });
    await user.click(numberedButton);

    expect(numberedButton).toBeInTheDocument();
  });

  it('should show character count', () => {
    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    expect(screen.getByText(/0.*\/.*50,000/)).toBeInTheDocument();
  });

  it('should call onSave after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const titleInput = screen.getByPlaceholderText(/untitled/i);
    await user.type(titleInput, 'Test');

    // Should not save immediately
    expect(mockOnTitleChange).toHaveBeenCalled();

    // Advance past debounce
    vi.advanceTimersByTime(2000);

    // onSave should have been called by the debounced auto-save
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});
```

### Step 1.4b.2: Write Version History Tests (RED)

Create `src/components/note-version-history.test.tsx`:

**Test Cases** (8 tests):

1. `it('should display version list')` - Render versions
2. `it('should show version number and date')` - Version info
3. `it('should show current version indicator')` - Current badge
4. `it('should preview version content on hover/click')` - Preview
5. `it('should allow restoring a version')` - Restore button
6. `it('should confirm restore action')` - Confirmation dialog
7. `it('should handle empty version history')` - No previous versions
8. `it('should disable restore for current version')` - Current version

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteVersionHistory } from './note-version-history';

const mockVersions = [
  {
    version: 3,
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 3 content"}]}]}',
    updatedAt: '2026-01-13T12:00:00Z',
  },
  {
    version: 2,
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 2 content"}]}]}',
    updatedAt: '2026-01-12T12:00:00Z',
  },
  {
    version: 1,
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Version 1 content"}]}]}',
    updatedAt: '2026-01-11T12:00:00Z',
  },
];

describe('NoteVersionHistory', () => {
  const mockOnRestore = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display version list', () => {
    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/version 3/i)).toBeInTheDocument();
    expect(screen.getByText(/version 2/i)).toBeInTheDocument();
    expect(screen.getByText(/version 1/i)).toBeInTheDocument();
  });

  it('should show version number and date', () => {
    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    // Should show relative dates
    expect(screen.getAllByText(/ago|jan/i).length).toBeGreaterThan(0);
  });

  it('should show current version indicator', () => {
    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/current/i)).toBeInTheDocument();
  });

  it('should preview version content on click', async () => {
    const user = userEvent.setup();

    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    const version2Item = screen.getByText(/version 2/i).closest('button, div[role="button"]');
    if (version2Item) {
      await user.click(version2Item);
    }

    // Should show preview content
    expect(screen.getByText(/version 2 content/i)).toBeInTheDocument();
  });

  it('should allow restoring a version', async () => {
    const user = userEvent.setup();

    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]!);

    // Should show confirmation or call restore
    expect(screen.getByText(/restore this version/i)).toBeInTheDocument();
  });

  it('should confirm restore action', async () => {
    const user = userEvent.setup();

    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    // Click restore on version 2
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[1]!);

    // Confirm in dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockOnRestore).toHaveBeenCalledWith(mockVersions[1]);
  });

  it('should handle empty version history', () => {
    render(
      <NoteVersionHistory
        currentVersion={1}
        previousVersions={[]}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/no previous versions/i)).toBeInTheDocument();
  });

  it('should show close button', async () => {
    const user = userEvent.setup();

    render(
      <NoteVersionHistory
        currentVersion={4}
        previousVersions={mockVersions}
        onRestore={mockOnRestore}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

### Step 1.4b.3: Write Profile Panel Notes Tab Tests (RED)

Create `src/components/person-notes-tab.test.tsx`:

**Test Cases** (10 tests):

1. `it('should render notes list')` - Display notes
2. `it('should show loading state')` - Loading spinner
3. `it('should show empty state')` - No notes message
4. `it('should open editor when note clicked')` - Edit mode
5. `it('should create new note')` - Add note flow
6. `it('should update note')` - Save changes
7. `it('should delete note with confirmation')` - Delete flow
8. `it('should show version history button')` - History access
9. `it('should handle save errors')` - Error state
10. `it('should close editor on escape')` - Keyboard navigation

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonNotesTab } from './person-notes-tab';

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
  })),
  useDeleteNote: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

import { usePersonNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-notes';

const mockNotes = [
  {
    id: 'note-1',
    personId: 'person-1',
    title: 'Childhood Memories',
    content: '{"type":"doc","content":[]}',
    privacy: 'PRIVATE' as const,
    version: 2,
    previousVersions: [{ version: 1, content: '...', updatedAt: '2026-01-12T00:00:00Z' }],
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
    } as ReturnType<typeof usePersonNotes>);
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
    } as ReturnType<typeof usePersonNotes>);

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state', () => {
    vi.mocked(usePersonNotes).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePersonNotes>);

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/no notes/i)).toBeInTheDocument();
  });

  it('should open editor when note clicked', async () => {
    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByText('Childhood Memories'));

    // Editor should be visible
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should create new note', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-note' });
    vi.mocked(useCreateNote).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateNote>);

    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /add note/i }));

    // Should show editor in create mode
    expect(screen.getByPlaceholderText(/untitled/i)).toBeInTheDocument();
  });

  it('should update note', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateNote).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateNote>);

    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    // Open editor
    await user.click(screen.getByText('Childhood Memories'));

    // Type in title
    const titleInput = screen.getByPlaceholderText(/untitled/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    // Save should be called (auto-save or manual)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    }, { timeout: 3000 });
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

    expect(screen.getByRole('button', { name: /history|versions/i })).toBeInTheDocument();
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

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('should close editor on back button', async () => {
    const user = userEvent.setup();

    render(<PersonNotesTab personId="person-1" />, { wrapper: createWrapper() });

    // Open editor
    await user.click(screen.getByText('Childhood Memories'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Click back/close
    await user.click(screen.getByRole('button', { name: /back|close/i }));

    // Should be back to list
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
```

### Step 1.4b.4: Install Tiptap Dependencies (GREEN)

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-character-count @tiptap/pm
```

### Step 1.4b.5: Implement Note Editor Component (GREEN)

Create `src/components/note-editor.tsx`:

```typescript
'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAutoSave } from '@/hooks/use-auto-save';
import { cn } from '@/lib/utils';

const MAX_CHARACTERS = 50000;
const WARNING_THRESHOLD = 45000;

type PrivacyLevel = 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';

interface NoteEditorProps {
  initialContent?: string;
  initialTitle?: string;
  initialPrivacy?: PrivacyLevel;
  onSave: (content: string) => void;
  onTitleChange: (title: string) => void;
  onPrivacyChange: (privacy: PrivacyLevel) => void;
  onClose?: () => void;
  disabled?: boolean;
}

export function NoteEditor({
  initialContent,
  initialTitle = '',
  initialPrivacy = 'PRIVATE',
  onSave,
  onTitleChange,
  onPrivacyChange,
  onClose,
  disabled = false,
}: NoteEditorProps): React.ReactElement {
  const [title, setTitle] = React.useState(initialTitle);
  const [privacy, setPrivacy] = React.useState<PrivacyLevel>(initialPrivacy);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount.configure({ limit: MAX_CHARACTERS }),
    ],
    content: initialContent ? JSON.parse(initialContent) : undefined,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      debouncedSave(JSON.stringify(editor.getJSON()));
    },
  });

  const { debouncedSave } = useAutoSave({
    onSave,
    delay: 2000,
  });

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange(newTitle);
  };

  const handlePrivacyChange = (newPrivacy: PrivacyLevel) => {
    setPrivacy(newPrivacy);
    onPrivacyChange(newPrivacy);
  };

  const characterCount = editor?.storage.characterCount.characters() ?? 0;
  const isNearLimit = characterCount >= WARNING_THRESHOLD;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled Note"
          className="flex-1 border-0 text-lg font-medium focus-visible:ring-0"
          disabled={disabled}
        />
        <Select
          value={privacy}
          onValueChange={(value) => handlePrivacyChange(value as PrivacyLevel)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px]" aria-label="Privacy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PRIVATE">Private</SelectItem>
            <SelectItem value="CONNECTIONS">Connections</SelectItem>
            <SelectItem value="PUBLIC">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(editor?.isActive('bold') && 'bg-muted')}
          disabled={disabled}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn(editor?.isActive('italic') && 'bg-muted')}
          disabled={disabled}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(editor?.isActive('heading', { level: 1 }) && 'bg-muted')}
          disabled={disabled}
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(editor?.isActive('heading', { level: 2 }) && 'bg-muted')}
          disabled={disabled}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn(editor?.isActive('bulletList') && 'bg-muted')}
          disabled={disabled}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn(editor?.isActive('orderedList') && 'bg-muted')}
          disabled={disabled}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none p-4 min-h-[200px] focus:outline-none"
        />
      </div>

      {/* Footer - Character count */}
      <div
        className={cn(
          'text-sm p-2 border-t text-muted-foreground',
          isNearLimit && 'text-yellow-500'
        )}
      >
        {characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters
        {isNearLimit && ' (approaching limit)'}
      </div>
    </div>
  );
}
```

### Step 1.4b.6: Implement Version History Component (GREEN)

Create `src/components/note-version-history.tsx`:

```typescript
'use client';

import * as React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { History, RotateCcw, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NoteVersion {
  version: number;
  content: string;
  updatedAt: string;
}

interface NoteVersionHistoryProps {
  currentVersion: number;
  previousVersions: NoteVersion[];
  onRestore: (version: NoteVersion) => void;
  onClose: () => void;
}

function extractText(content: string): string {
  try {
    const json = JSON.parse(content);
    const extract = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';
      const obj = node as Record<string, unknown>;
      if (obj.text && typeof obj.text === 'string') return obj.text;
      if (Array.isArray(obj.content)) {
        return obj.content.map(extract).join(' ');
      }
      return '';
    };
    return extract(json);
  } catch {
    return content;
  }
}

export function NoteVersionHistory({
  currentVersion,
  previousVersions,
  onRestore,
  onClose,
}: NoteVersionHistoryProps): React.ReactElement {
  const [selectedVersion, setSelectedVersion] = React.useState<NoteVersion | null>(null);
  const [restoreVersion, setRestoreVersion] = React.useState<NoteVersion | null>(null);

  const handleRestore = () => {
    if (restoreVersion) {
      onRestore(restoreVersion);
      setRestoreVersion(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-medium">Version History</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Version List */}
        <ScrollArea className="w-64 border-r">
          <div className="p-2 space-y-1">
            {/* Current version */}
            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="font-medium">Version {currentVersion}</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Current
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Now</span>
            </div>

            {/* Previous versions */}
            {previousVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">No previous versions</p>
            ) : (
              previousVersions.map((version) => (
                <button
                  key={version.version}
                  onClick={() => setSelectedVersion(version)}
                  className={`w-full p-3 rounded-md text-left hover:bg-muted/50 transition-colors ${
                    selectedVersion?.version === version.version ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Version {version.version}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(version.updatedAt), { addSuffix: true })}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col">
          {selectedVersion ? (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Version {selectedVersion.version}</h4>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedVersion.updatedAt), 'PPpp')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setRestoreVersion(selectedVersion)}
                  aria-label="Restore"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-muted-foreground">{extractText(selectedVersion.content)}</p>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a version to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreVersion} onOpenChange={() => setRestoreVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore Version {restoreVersion?.version} as a new version.
              Your current content will be saved in version history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Step 1.4b.7: Implement Person Notes Tab Component (GREEN)

Create `src/components/person-notes-tab.tsx`:

```typescript
'use client';

import * as React from 'react';
import { Loader2, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NoteList } from './note-list';
import { NoteEditor } from './note-editor';
import { NoteVersionHistory } from './note-version-history';
import {
  usePersonNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  type Note,
  type NoteVersion,
} from '@/hooks/use-notes';

interface PersonNotesTabProps {
  personId: string;
}

type ViewMode = 'list' | 'edit' | 'history';

export function PersonNotesTab({ personId }: PersonNotesTabProps): React.ReactElement {
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [deleteNoteId, setDeleteNoteId] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const { data: notes, isLoading, isError } = usePersonNotes(personId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const handleNoteClick = (noteId: string) => {
    const note = notes?.find((n) => n.id === noteId);
    if (note) {
      setSelectedNote(note);
      setViewMode('edit');
      setSaveError(null);
    }
  };

  const handleAddNote = async () => {
    setIsCreating(true);
    try {
      const newNote = await createNote.mutateAsync({
        personId,
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        privacy: 'PRIVATE',
      });
      setSelectedNote(newNote);
      setViewMode('edit');
    } catch {
      setSaveError('Failed to create note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveContent = async (content: string) => {
    if (!selectedNote) return;
    try {
      await updateNote.mutateAsync({
        id: selectedNote.id,
        input: { content },
      });
      setSaveError(null);
    } catch {
      setSaveError('Failed to save');
    }
  };

  const handleTitleChange = async (title: string) => {
    if (!selectedNote) return;
    try {
      await updateNote.mutateAsync({
        id: selectedNote.id,
        input: { title: title || undefined },
      });
    } catch {
      setSaveError('Failed to save title');
    }
  };

  const handlePrivacyChange = async (privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC') => {
    if (!selectedNote) return;
    try {
      await updateNote.mutateAsync({
        id: selectedNote.id,
        input: { privacy },
      });
    } catch {
      setSaveError('Failed to update privacy');
    }
  };

  const handleDelete = () => {
    if (deleteNoteId) {
      deleteNote.mutate(deleteNoteId);
      setDeleteNoteId(null);
      setSelectedNote(null);
      setViewMode('list');
    }
  };

  const handleRestoreVersion = async (version: NoteVersion) => {
    if (!selectedNote) return;
    try {
      await updateNote.mutateAsync({
        id: selectedNote.id,
        input: { content: version.content },
      });
      setViewMode('edit');
    } catch {
      setSaveError('Failed to restore version');
    }
  };

  const handleBack = () => {
    setSelectedNote(null);
    setViewMode('list');
    setSaveError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading notes...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error loading notes</p>
      </div>
    );
  }

  // Version History View
  if (viewMode === 'history' && selectedNote) {
    return (
      <NoteVersionHistory
        currentVersion={selectedNote.version}
        previousVersions={(selectedNote.previousVersions as NoteVersion[]) || []}
        onRestore={handleRestoreVersion}
        onClose={() => setViewMode('edit')}
      />
    );
  }

  // Editor View
  if (viewMode === 'edit' && selectedNote) {
    return (
      <div className="flex flex-col h-full">
        <NoteEditor
          initialContent={selectedNote.content}
          initialTitle={selectedNote.title || ''}
          initialPrivacy={selectedNote.privacy}
          onSave={handleSaveContent}
          onTitleChange={handleTitleChange}
          onPrivacyChange={handlePrivacyChange}
          onClose={handleBack}
        />

        {/* Action Bar */}
        <div className="flex items-center justify-between p-2 border-t">
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-sm text-destructive">{saveError}</span>
            )}
            {updateNote.isPending && (
              <span className="text-sm text-muted-foreground flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('history')}
              disabled={!selectedNote.previousVersions?.length}
            >
              <History className="h-4 w-4 mr-2" />
              History ({selectedNote.previousVersions?.length || 0})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteNoteId(selectedNote.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                This note will be moved to trash and can be recovered within 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List View
  return (
    <NoteList
      notes={notes || []}
      onNoteClick={handleNoteClick}
      onAddNote={handleAddNote}
      onDeleteNote={(id) => setDeleteNoteId(id)}
    />
  );
}
```

### Step 1.4b.8: Integrate with Profile Panel (GREEN)

Update `src/components/person-profile-panel.tsx` to add Notes tab:

```typescript
// Add import
import { PersonNotesTab } from './person-notes-tab';

// In the TabsContent section, add:
<TabsContent value="notes" className="flex-1 overflow-hidden">
  {selectedPersonId && <PersonNotesTab personId={selectedPersonId} />}
</TabsContent>
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/note-editor.tsx` | CREATE | Tiptap rich text editor |
| `src/components/note-editor.test.tsx` | CREATE | Editor tests |
| `src/components/note-version-history.tsx` | CREATE | Version history UI |
| `src/components/note-version-history.test.tsx` | CREATE | History tests |
| `src/components/person-notes-tab.tsx` | CREATE | Notes tab orchestrator |
| `src/components/person-notes-tab.test.tsx` | CREATE | Tab tests |
| `src/components/person-profile-panel.tsx` | MODIFY | Add Notes tab |

---

## Verification

```bash
# Install dependencies
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-character-count @tiptap/pm

# Run specific tests
npx vitest run src/components/note-editor.test.tsx
npx vitest run src/components/note-version-history.test.tsx
npx vitest run src/components/person-notes-tab.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All ~30 new tests pass
- [ ] Tiptap editor renders with formatting toolbar
- [ ] Bold, italic, headings, lists work
- [ ] Character count displays correctly
- [ ] Auto-save triggers after 2s debounce
- [ ] Version history displays previous versions
- [ ] Can restore previous version
- [ ] Notes tab integrated in profile panel
- [ ] Type check passes
- [ ] Lint passes

---

*Created: 2026-01-13*
*Depends on: Phase 1.4 (backend complete)*
