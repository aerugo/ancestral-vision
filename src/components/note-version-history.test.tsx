import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    // Should show relative dates or formatted dates
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

    // Find and click version 2 item
    const version2Text = screen.getByText(/version 2/i);
    const version2Item = version2Text.closest('button') || version2Text.closest('[role="button"]');
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

    // Click on a version first to select it
    const version3Text = screen.getByText(/version 3/i);
    const version3Item = version3Text.closest('button') || version3Text.closest('[role="button"]');
    if (version3Item) {
      await user.click(version3Item);
    }

    // Now find and click restore button
    const restoreButton = screen.getByRole('button', { name: /restore/i });
    await user.click(restoreButton);

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

    // Click on version 2 to select it
    const version2Text = screen.getByText(/version 2/i);
    const version2Item = version2Text.closest('button') || version2Text.closest('[role="button"]');
    if (version2Item) {
      await user.click(version2Item);
    }

    // Click restore
    const restoreButton = screen.getByRole('button', { name: /restore/i });
    await user.click(restoreButton);

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
