/**
 * SourceContentModal Component
 *
 * Modal for displaying source content (notes, events, biographies)
 * when clicking on citations in a generated biography.
 */
'use client';

import * as React from 'react';
import { X, FileText, Calendar, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSourceContent, type SourceContent } from '@/hooks/use-source-content';
import type { CitationType } from '@/types/citation';

interface SourceContentModalProps {
  type: CitationType;
  id: string;
  onClose: () => void;
}

/**
 * SourceContentModal - Displays source content in a modal overlay
 *
 * Fetches and displays:
 * - Notes: Rich text content with title and metadata
 * - Events: Structured data with date, location, participants
 * - Biographies: Person name and biography text
 */
export function SourceContentModal({
  type,
  id,
  onClose,
}: SourceContentModalProps): React.ReactElement {
  const { data, isLoading, error } = useSourceContent(type, id);
  const content = data?.sourceContent;

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Content */}
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-background shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {getSourceIcon(type)}
            <h2 id="source-modal-title" className="text-lg font-semibold">
              {getSourceTitle(type)}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load source content</p>
            </div>
          )}

          {!isLoading && !error && !content && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Source not found or not accessible</p>
            </div>
          )}

          {content && renderContent(content)}
        </div>
      </div>
    </div>
  );
}

/**
 * Get the icon for a source type
 */
function getSourceIcon(type: CitationType): React.ReactElement {
  switch (type) {
    case 'Note':
      return <FileText className="h-5 w-5 text-primary" />;
    case 'Event':
      return <Calendar className="h-5 w-5 text-primary" />;
    case 'Biography':
      return <User className="h-5 w-5 text-primary" />;
  }
}

/**
 * Get the title for a source type
 */
function getSourceTitle(type: CitationType): string {
  switch (type) {
    case 'Note':
      return 'Note';
    case 'Event':
      return 'Event';
    case 'Biography':
      return 'Biography';
  }
}

/**
 * Render the content based on its type
 */
function renderContent(content: SourceContent): React.ReactElement {
  switch (content.__typename) {
    case 'NoteContent':
      return <NoteContentView content={content} />;
    case 'EventContent':
      return <EventContentView content={content} />;
    case 'BiographyContent':
      return <BiographyContentView content={content} />;
    default:
      return <p>Unknown content type</p>;
  }
}

/**
 * Note content view
 */
function NoteContentView({
  content,
}: {
  content: Extract<SourceContent, { __typename: 'NoteContent' }>;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      {content.title && (
        <h3 className="font-medium text-lg">{content.title}</h3>
      )}
      <div className="prose prose-sm prose-invert max-w-none">
        <p className="whitespace-pre-wrap">{content.content}</p>
      </div>
      <div className="text-xs text-muted-foreground pt-2 border-t">
        Last updated: {new Date(content.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}

/**
 * Event content view
 */
function EventContentView({
  content,
}: {
  content: Extract<SourceContent, { __typename: 'EventContent' }>;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-lg">{content.title}</h3>

      {content.date && (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatEventDate(content.date)}</span>
        </div>
      )}

      {content.location && (
        <div className="text-sm text-muted-foreground">
          {formatLocation(content.location)}
        </div>
      )}

      {content.description && (
        <div className="prose prose-sm prose-invert max-w-none pt-2">
          <p className="whitespace-pre-wrap">{content.description}</p>
        </div>
      )}

      {content.participants.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Participants:</p>
          <div className="flex flex-wrap gap-1">
            {content.participants.map((p) => (
              <span
                key={p.id}
                className="text-xs bg-secondary px-2 py-0.5 rounded"
              >
                {p.displayName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Biography content view
 */
function BiographyContentView({
  content,
}: {
  content: Extract<SourceContent, { __typename: 'BiographyContent' }>;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium text-lg">{content.personName}</h3>
      </div>

      {content.biography ? (
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{content.biography}</p>
        </div>
      ) : (
        <p className="text-muted-foreground italic">No biography available</p>
      )}
    </div>
  );
}

/**
 * Format a fuzzy date for display
 */
function formatEventDate(date: unknown): string {
  if (!date || typeof date !== 'object') return 'Unknown date';

  const d = date as { type?: string; year?: number; month?: number; day?: number };

  if (!d.year) return 'Unknown date';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  let prefix = '';
  if (d.type === 'approximate') prefix = 'Around ';
  else if (d.type === 'before') prefix = 'Before ';
  else if (d.type === 'after') prefix = 'After ';

  if (d.month && d.day) {
    return `${prefix}${months[d.month - 1]} ${d.day}, ${d.year}`;
  } else if (d.month) {
    return `${prefix}${months[d.month - 1]} ${d.year}`;
  }
  return `${prefix}${d.year}`;
}

/**
 * Format location for display
 */
function formatLocation(location: unknown): string {
  if (!location || typeof location !== 'object') return '';

  const loc = location as { name?: string; city?: string; region?: string; country?: string };

  const parts = [loc.name, loc.city, loc.region, loc.country].filter(Boolean);
  return parts.join(', ');
}
