/**
 * Phase 1.4: Note List Component Tests
 *
 * TDD Tests for the NoteList component:
 * - Rendering list of notes
 * - Empty state
 * - Privacy badges
 * - Timestamps
 * - Click handlers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteList } from './note-list';

const mockNotes = [
  {
    id: 'note-1',
    title: 'Childhood memories',
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Some content here about childhood..."}]}]}',
    privacy: 'PRIVATE' as const,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Family history',
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"History of the family line..."}]}]}',
    privacy: 'CONNECTIONS' as const,
    version: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-3',
    title: null, // Untitled note
    content: 'Plain text content without JSON structure',
    privacy: 'PUBLIC' as const,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('NoteList', () => {
  const mockOnNoteClick = vi.fn();
  const mockOnAddNote = vi.fn();
  const mockOnDeleteNote = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render list of notes', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    expect(screen.getByText('Childhood memories')).toBeInTheDocument();
    expect(screen.getByText('Family history')).toBeInTheDocument();
  });

  it('should show note title and preview', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    expect(screen.getByText('Childhood memories')).toBeInTheDocument();
    // Content preview should be extracted from JSON
    expect(screen.getByText(/Some content here about childhood/)).toBeInTheDocument();
  });

  it('should show "Untitled Note" for notes without title', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    expect(screen.getByText('Untitled Note')).toBeInTheDocument();
  });

  it('should show relative timestamps', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    // Should show relative time like "less than a minute ago"
    expect(screen.getAllByText(/ago|just now|less than/i).length).toBeGreaterThan(0);
  });

  it('should show version number', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    // Multiple v1 versions in test data
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
    expect(screen.getByText('v3')).toBeInTheDocument();
  });

  it('should handle empty state', () => {
    render(
      <NoteList
        notes={[]}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    expect(screen.getByText(/no notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add first note/i })).toBeInTheDocument();
  });

  it('should open editor on click', async () => {
    const user = userEvent.setup();

    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    await user.click(screen.getByText('Childhood memories'));

    expect(mockOnNoteClick).toHaveBeenCalledWith('note-1');
  });

  it('should show add note button', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });

  it('should call onAddNote when add button clicked', async () => {
    const user = userEvent.setup();

    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    await user.click(screen.getByRole('button', { name: /add note/i }));

    expect(mockOnAddNote).toHaveBeenCalled();
  });

  it('should call onAddNote in empty state', async () => {
    const user = userEvent.setup();

    render(
      <NoteList
        notes={[]}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    await user.click(screen.getByRole('button', { name: /add first note/i }));

    expect(mockOnAddNote).toHaveBeenCalled();
  });

  it('should handle plain text content gracefully', () => {
    render(
      <NoteList
        notes={mockNotes}
        onNoteClick={mockOnNoteClick}
        onAddNote={mockOnAddNote}
        onDeleteNote={mockOnDeleteNote}
      />
    );

    // Plain text content should be shown directly
    expect(screen.getByText(/Plain text content/)).toBeInTheDocument();
  });
});
