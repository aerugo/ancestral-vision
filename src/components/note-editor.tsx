'use client';

import * as React from 'react';
import { useEditor, EditorContent, type Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAX_CHARACTERS = 50000;
const WARNING_THRESHOLD = 45000;

type PrivacyLevel = 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';

/**
 * Parse note content that may be either Tiptap JSON or plain text
 * Returns Tiptap-compatible content structure
 */
function parseNoteContent(content: string | undefined): Content | undefined {
  if (!content) return undefined;

  try {
    // Try to parse as JSON (Tiptap format)
    const parsed = JSON.parse(content) as Content;
    // Verify it looks like Tiptap JSON (has type property)
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      return parsed;
    }
    // If it's valid JSON but not Tiptap format, treat as plain text
    return convertPlainTextToTiptap(content);
  } catch {
    // Not valid JSON, treat as plain text
    return convertPlainTextToTiptap(content);
  }
}

/**
 * Convert plain text to Tiptap document format
 */
function convertPlainTextToTiptap(text: string): Content {
  // Split by newlines and create paragraph nodes
  const paragraphs = text.split('\n').map(line => ({
    type: 'paragraph',
    content: line.trim() ? [{ type: 'text', text: line }] : [],
  }));

  return {
    type: 'doc',
    content: paragraphs,
  };
}

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
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount.configure({ limit: MAX_CHARACTERS }),
    ],
    content: parseNoteContent(initialContent),
    editable: !disabled,
    immediatelyRender: false, // Prevents SSR hydration errors in Next.js App Router
    onUpdate: ({ editor }) => {
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onSave(JSON.stringify(editor.getJSON()));
      }, 2000);
    },
  });

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange(newTitle);
  };

  const handlePrivacyChange = (newPrivacy: PrivacyLevel) => {
    setPrivacy(newPrivacy);
    onPrivacyChange(newPrivacy);
  };

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isNearLimit = characterCount >= WARNING_THRESHOLD;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
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
        <select
          value={privacy}
          onChange={(e) => handlePrivacyChange(e.target.value as PrivacyLevel)}
          disabled={disabled}
          aria-label="Privacy"
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
        >
          <option value="PRIVATE">Private</option>
          <option value="CONNECTIONS">Connections</option>
          <option value="PUBLIC">Public</option>
        </select>
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
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            editor?.isActive('heading', { level: 1 }) && 'bg-muted'
          )}
          disabled={disabled}
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            editor?.isActive('heading', { level: 2 }) && 'bg-muted'
          )}
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
        {characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}{' '}
        characters
        {isNearLimit && ' (approaching limit)'}
      </div>
    </div>
  );
}
