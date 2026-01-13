/**
 * Phase 1.4: Note List Component
 *
 * Displays a list of notes for a person with:
 * - Title and content preview
 * - Privacy badges
 * - Relative timestamps
 * - Version numbers
 * - Empty state handling
 */
'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Lock, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Privacy level type
 */
type PrivacyLevel = 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';

/**
 * Note data structure
 */
interface Note {
  id: string;
  title: string | null;
  content: string;
  privacy: PrivacyLevel;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Props for NoteList component
 */
interface NoteListProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

/**
 * Privacy icons mapping
 */
const privacyIcons = {
  PRIVATE: Lock,
  CONNECTIONS: Users,
  PUBLIC: Globe,
} as const;

/**
 * Extract text content from Tiptap JSON
 */
function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const obj = node as Record<string, unknown>;
  if (obj.text && typeof obj.text === 'string') return obj.text;
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractText).join(' ');
  }
  return '';
}

/**
 * Get a preview of the note content
 */
function getPreview(content: string): string {
  try {
    const json = JSON.parse(content);
    const text = extractText(json);
    return text.slice(0, 150) + (text.length > 150 ? '...' : '');
  } catch {
    // Fallback for plain text content
    return content.slice(0, 150) + (content.length > 150 ? '...' : '');
  }
}

/**
 * NoteList component displays a list of notes with previews and metadata
 */
export function NoteList({
  notes,
  onNoteClick,
  onAddNote,
  onDeleteNote,
}: NoteListProps): React.ReactElement {
  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No notes yet</p>
        <Button onClick={onAddNote}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Note
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAddNote} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {notes.map((note) => {
        const PrivacyIcon = privacyIcons[note.privacy];
        return (
          <Card
            key={note.id}
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onNoteClick(note.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">
                  {note.title || 'Untitled Note'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {getPreview(note.content)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  <PrivacyIcon className="h-3 w-3" />
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
              </span>
              <span>v{note.version}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
