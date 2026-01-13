'use client';

import * as React from 'react';
import { Loader2, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function PersonNotesTab({
  personId,
}: PersonNotesTabProps): React.ReactElement {
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
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

  const handlePrivacyChange = async (
    privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC'
  ) => {
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
              aria-label="History"
            >
              <History className="h-4 w-4 mr-2" />
              History ({selectedNote.previousVersions?.length || 0})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteNoteId(selectedNote.id)}
              className="text-destructive hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {deleteNoteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete this note?</h3>
              <p className="text-muted-foreground mb-4">
                This note will be moved to trash and can be recovered within 30
                days.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteNoteId(null)}>
                  Cancel
                </Button>
                <Button onClick={handleDelete} aria-label="Confirm">
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
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
