import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Track calls to useEditor for assertions
let useEditorCalls: unknown[] = [];

// Mock Tiptap - inline the implementation to avoid hoisting issues
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((config: unknown) => {
    useEditorCalls.push(config);
    return {
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
    };
  }),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" role="textbox" />
  ),
}));

import { NoteEditor } from './note-editor';
import { useEditor } from '@tiptap/react';

describe('NoteEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnTitleChange = vi.fn();
  const mockOnPrivacyChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useEditorCalls = [];
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
    const user = userEvent.setup();

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
    const user = userEvent.setup();

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
    const user = userEvent.setup();

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
    const user = userEvent.setup();

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
    const user = userEvent.setup();

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

  it('should call onTitleChange when title changes', async () => {
    const user = userEvent.setup();

    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    const titleInput = screen.getByPlaceholderText(/untitled/i);
    await user.type(titleInput, 'Test');

    expect(mockOnTitleChange).toHaveBeenCalled();
  });

  it('should configure useEditor with immediatelyRender: false to prevent SSR hydration errors', () => {
    render(
      <NoteEditor
        onSave={mockOnSave}
        onTitleChange={mockOnTitleChange}
        onPrivacyChange={mockOnPrivacyChange}
      />
    );

    // Verify useEditor was called with immediatelyRender: false
    expect(useEditorCalls.length).toBeGreaterThan(0);
    expect(useEditorCalls[0]).toMatchObject({
      immediatelyRender: false,
    });
  });
});
