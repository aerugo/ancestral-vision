# Phase 1.4: Notes System

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement rich text notes with Tiptap editor, version history (last 10), privacy levels, and integration with the profile panel. Notes are freeform and contribute to biography weight.

---

## Invariants Enforced in This Phase

- **INV-D001**: Entity IDs are UUID v4 - Note IDs
- **INV-D005**: Soft Delete with 30-Day Recovery - Notes use deletedAt/deletedBy
- **INV-S001**: All GraphQL Mutations Require Authentication
- **INV-S002**: Users Can Only Access Their Own Constellation
- **INV-A005**: TanStack Query for Server State
- **INV-U003**: Form Validation Uses Zod
- **NEW INV-D006**: Notes have version history (max 10) - Stored as JSON array

---

## TDD Steps

### Step 1.4.1: Write Note GraphQL Tests (RED)

Create `src/graphql/resolvers/note.test.ts`:

**Test Cases**:

1. `it('should return notes for a person')` - Query personNotes
2. `it('should return empty array for unauthenticated user')` - Auth check
3. `it('should create a note')` - createNote mutation
4. `it('should require authentication to create note')` - Auth error
5. `it('should enforce 50,000 character limit')` - Validation
6. `it('should update a note')` - updateNote mutation
7. `it('should increment version on update')` - Version tracking
8. `it('should store previous version on update')` - Version history
9. `it('should limit to 10 previous versions')` - Version limit
10. `it('should soft delete a note')` - deleteNote sets deletedAt
11. `it('should exclude deleted notes from queries')` - Filter deleted
12. `it('should support privacy levels')` - PRIVATE, CONNECTIONS, PUBLIC

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestData } from '@/tests/graphql-test-utils';
import { gql } from 'graphql-tag';

const CREATE_NOTE = gql`
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      id
      title
      content
      privacy
      version
      createdAt
    }
  }
`;

const UPDATE_NOTE = gql`
  mutation UpdateNote($id: ID!, $input: UpdateNoteInput!) {
    updateNote(id: $id, input: $input) {
      id
      content
      version
      previousVersions
    }
  }
`;

const DELETE_NOTE = gql`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id) {
      id
      deletedAt
    }
  }
`;

const GET_PERSON_NOTES = gql`
  query PersonNotes($personId: ID!) {
    personNotes(personId: $personId) {
      id
      title
      content
      privacy
      version
      createdAt
      updatedAt
    }
  }
`;

describe('Note Resolvers', () => {
  // ... setup and tests
});
```

### Step 1.4.2: Write Note Hooks Tests (RED)

Create `src/hooks/use-notes.test.ts`:

**Test Cases**:

1. `it('should fetch notes for a person')` - usePersonNotes hook
2. `it('should create a note')` - useCreateNote mutation
3. `it('should update a note')` - useUpdateNote mutation
4. `it('should delete a note')` - useDeleteNote mutation
5. `it('should handle loading state')` - isLoading flag
6. `it('should handle errors')` - Error handling
7. `it('should invalidate cache after mutation')` - Cache invalidation

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePersonNotes, useCreateNote, useUpdateNote, useDeleteNote } from './use-notes';

vi.mock('@/lib/graphql-client');

describe('Note Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  // ... tests
});
```

### Step 1.4.3: Write Note Editor Tests (RED)

Create `src/components/note-editor.test.tsx`:

**Test Cases**:

1. `it('should render Tiptap editor')` - Editor mounts
2. `it('should display existing content')` - Load content
3. `it('should support bold formatting')` - Bold button
4. `it('should support italic formatting')` - Italic button
5. `it('should support headings')` - Heading levels
6. `it('should support bullet lists')` - Unordered lists
7. `it('should support numbered lists')` - Ordered lists
8. `it('should auto-save on content change')` - Debounced save (INV-A010)
9. `it('should show character count')` - Character counter
10. `it('should warn at 45,000 characters')` - 90% warning
11. `it('should prevent exceeding 50,000 characters')` - Hard limit
12. `it('should call onSave with Tiptap JSON')` - Save callback

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from './note-editor';

describe('NoteEditor', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Tiptap editor', () => {
    render(<NoteEditor onSave={mockOnSave} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should auto-save on content change', async () => {
    vi.useFakeTimers();
    render(<NoteEditor onSave={mockOnSave} />);

    const editor = screen.getByRole('textbox');
    await userEvent.type(editor, 'Test content');

    // Should not save immediately
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fast-forward 2 seconds
    vi.advanceTimersByTime(2000);

    expect(mockOnSave).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ... more tests
});
```

### Step 1.4.4: Write Note List Tests (RED)

Create `src/components/note-list.test.tsx`:

**Test Cases**:

1. `it('should render list of notes')` - Note display
2. `it('should show note title and preview')` - Content preview
3. `it('should show relative timestamps')` - "2 hours ago"
4. `it('should show privacy badge')` - Privacy indicator
5. `it('should handle empty state')` - No notes message
6. `it('should open editor on click')` - Click handler
7. `it('should show add note button')` - Create new
8. `it('should confirm before delete')` - Delete confirmation

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteList } from './note-list';

const mockNotes = [
  {
    id: 'note-1',
    title: 'Childhood memories',
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Some content here..."}]}]}',
    privacy: 'PRIVATE',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('NoteList', () => {
  it('should render list of notes', () => {
    render(<NoteList notes={mockNotes} onNoteClick={vi.fn()} />);

    expect(screen.getByText('Childhood memories')).toBeInTheDocument();
  });

  // ... more tests
});
```

### Step 1.4.5: Write Version History Tests (RED)

Create `src/components/note-version-history.test.tsx`:

**Test Cases**:

1. `it('should display version list')` - Version display
2. `it('should show version number and date')` - Version info
3. `it('should preview version content')` - Content preview
4. `it('should allow restoring a version')` - Restore action
5. `it('should confirm restore action')` - Confirmation dialog
6. `it('should show diff between versions')` - Optional diff view

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteVersionHistory } from './note-version-history';

const mockVersions = [
  { version: 3, content: '...', updatedAt: '2026-01-13T12:00:00Z' },
  { version: 2, content: '...', updatedAt: '2026-01-12T12:00:00Z' },
  { version: 1, content: '...', updatedAt: '2026-01-11T12:00:00Z' },
];

describe('NoteVersionHistory', () => {
  it('should display version list', () => {
    render(<NoteVersionHistory versions={mockVersions} onRestore={vi.fn()} />);

    expect(screen.getByText('Version 3')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Version 1')).toBeInTheDocument();
  });

  // ... more tests
});
```

### Step 1.4.6: Implement GraphQL Schema & Resolvers (GREEN)

Update `src/graphql/schema.ts`:

```typescript
// Add to typeDefs
type Note {
  id: ID!
  personId: ID!
  title: String
  content: String!
  privacy: PrivacyLevel!
  version: Int!
  previousVersions: JSON
  referencedPersonIds: [ID!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateNoteInput {
  personId: ID!
  title: String
  content: String!
  privacy: PrivacyLevel
}

input UpdateNoteInput {
  title: String
  content: String
  privacy: PrivacyLevel
}

extend type Query {
  personNotes(personId: ID!): [Note!]!
  note(id: ID!): Note
}

extend type Mutation {
  createNote(input: CreateNoteInput!): Note!
  updateNote(id: ID!, input: UpdateNoteInput!): Note!
  deleteNote(id: ID!): Note!
}
```

Create resolver at `src/graphql/resolvers/note.ts`:

```typescript
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types';

const MAX_CONTENT_LENGTH = 50000;
const MAX_VERSIONS = 10;

export const noteResolvers = {
  Query: {
    personNotes: async (_: unknown, { personId }: { personId: string }, ctx: GraphQLContext) => {
      if (!ctx.user) return [];

      const person = await ctx.prisma.person.findFirst({
        where: { id: personId, constellation: { ownerId: ctx.user.uid } },
      });
      if (!person) return [];

      return ctx.prisma.note.findMany({
        where: { personId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
    },
  },

  Mutation: {
    createNote: async (_: unknown, { input }: { input: CreateNoteInput }, ctx: GraphQLContext) => {
      requireAuth(ctx);

      if (input.content.length > MAX_CONTENT_LENGTH) {
        throw new GraphQLError('Note content exceeds 50,000 character limit');
      }

      // Verify person belongs to user's constellation
      const person = await ctx.prisma.person.findFirst({
        where: { id: input.personId, constellation: { ownerId: ctx.user!.uid } },
        include: { constellation: true },
      });

      if (!person) {
        throw new GraphQLError('Person not found');
      }

      return ctx.prisma.note.create({
        data: {
          personId: input.personId,
          constellationId: person.constellationId,
          title: input.title,
          content: input.content,
          privacy: input.privacy || 'PRIVATE',
          version: 1,
          createdBy: ctx.user!.uid,
        },
      });
    },

    updateNote: async (_: unknown, { id, input }: { id: string; input: UpdateNoteInput }, ctx: GraphQLContext) => {
      requireAuth(ctx);

      const note = await ctx.prisma.note.findFirst({
        where: { id, constellation: { ownerId: ctx.user!.uid }, deletedAt: null },
      });

      if (!note) {
        throw new GraphQLError('Note not found');
      }

      // Build previous versions array
      const currentVersion = {
        version: note.version,
        content: note.content,
        updatedAt: note.updatedAt.toISOString(),
      };

      const previousVersions = Array.isArray(note.previousVersions)
        ? [currentVersion, ...note.previousVersions].slice(0, MAX_VERSIONS)
        : [currentVersion];

      return ctx.prisma.note.update({
        where: { id },
        data: {
          ...input,
          version: note.version + 1,
          previousVersions,
        },
      });
    },

    deleteNote: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);

      const note = await ctx.prisma.note.findFirst({
        where: { id, constellation: { ownerId: ctx.user!.uid } },
      });

      if (!note) {
        throw new GraphQLError('Note not found');
      }

      return ctx.prisma.note.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },
  },
};
```

### Step 1.4.7: Implement TanStack Query Hooks (GREEN)

Create `src/hooks/use-notes.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-tag';

const PERSON_NOTES_QUERY = gql`
  query PersonNotes($personId: ID!) {
    personNotes(personId: $personId) {
      id
      title
      content
      privacy
      version
      previousVersions
      createdAt
      updatedAt
    }
  }
`;

export function usePersonNotes(personId: string | null) {
  return useQuery({
    queryKey: ['notes', personId],
    queryFn: () => graphqlClient.request(PERSON_NOTES_QUERY, { personId }),
    enabled: !!personId,
    select: (data) => data.personNotes,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      graphqlClient.request(CREATE_NOTE_MUTATION, { input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.personId] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      graphqlClient.request(UPDATE_NOTE_MUTATION, { id, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      graphqlClient.request(DELETE_NOTE_MUTATION, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
```

### Step 1.4.8: Implement Tiptap Editor Component (GREEN)

Create `src/components/note-editor.tsx`:

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { useAutoSave } from '@/hooks/use-auto-save';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';

const MAX_CHARACTERS = 50000;
const WARNING_THRESHOLD = 45000;

interface NoteEditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
  disabled?: boolean;
}

export function NoteEditor({ initialContent, onSave, disabled }: NoteEditorProps): JSX.Element {
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

  const characterCount = editor?.storage.characterCount.characters() ?? 0;
  const isNearLimit = characterCount >= WARNING_THRESHOLD;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          data-active={editor?.isActive('bold')}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none p-4 min-h-[200px]"
      />

      {/* Character count */}
      <div className={`text-sm p-2 border-t ${isNearLimit ? 'text-yellow-500' : 'text-muted-foreground'}`}>
        {characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters
        {isNearLimit && ' (approaching limit)'}
      </div>
    </div>
  );
}
```

### Step 1.4.9: Implement Note List Component (GREEN)

Create `src/components/note-list.tsx`:

```typescript
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus, Lock, Users, Globe, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Note {
  id: string;
  title: string | null;
  content: string;
  privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface NoteListProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

const privacyIcons = {
  PRIVATE: Lock,
  CONNECTIONS: Users,
  PUBLIC: Globe,
};

export function NoteList({ notes, onNoteClick, onAddNote, onDeleteNote }: NoteListProps): JSX.Element {
  const getPreview = (content: string): string => {
    try {
      const json = JSON.parse(content);
      // Extract text from Tiptap JSON
      const text = extractText(json);
      return text.slice(0, 150) + (text.length > 150 ? '...' : '');
    } catch {
      return content.slice(0, 150);
    }
  };

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
                <Badge variant="secondary" className="flex items-center gap-1">
                  <PrivacyIcon className="h-3 w-3" />
                </Badge>
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

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const obj = node as Record<string, unknown>;
  if (obj.text && typeof obj.text === 'string') return obj.text;
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractText).join(' ');
  }
  return '';
}
```

### Step 1.4.10: Integrate with Profile Panel (GREEN)

Update `src/components/person-profile-panel.tsx` to include Notes tab:

```typescript
// Add to existing tabs
<TabsContent value="notes">
  <Suspense fallback={<div>Loading notes...</div>}>
    <PersonNotes personId={selectedPersonId} />
  </Suspense>
</TabsContent>

// PersonNotes component
function PersonNotes({ personId }: { personId: string }): JSX.Element {
  const { data: notes, isLoading } = usePersonNotes(personId);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // ... render logic
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/graphql/schema.ts` | MODIFY | Add Note types and operations |
| `src/graphql/resolvers/note.ts` | CREATE | Note resolver implementation |
| `src/graphql/resolvers/note.test.ts` | CREATE | Note resolver tests |
| `src/hooks/use-notes.ts` | CREATE | TanStack Query hooks |
| `src/hooks/use-notes.test.ts` | CREATE | Hook tests |
| `src/components/note-editor.tsx` | CREATE | Tiptap rich text editor |
| `src/components/note-editor.test.tsx` | CREATE | Editor tests |
| `src/components/note-list.tsx` | CREATE | Note list display |
| `src/components/note-list.test.tsx` | CREATE | List tests |
| `src/components/note-version-history.tsx` | CREATE | Version history UI |
| `src/components/note-version-history.test.tsx` | CREATE | History tests |
| `src/components/person-profile-panel.tsx` | MODIFY | Add Notes tab |

---

## Verification

```bash
# Run specific tests
npx vitest run src/graphql/resolvers/note.test.ts
npx vitest run src/hooks/use-notes.test.ts
npx vitest run src/components/note-editor.test.tsx
npx vitest run src/components/note-list.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All ~25 note tests pass
- [ ] Can create/edit/delete notes
- [ ] Rich text formatting works (bold, italic, headings, lists)
- [ ] 50,000 character limit enforced
- [ ] Last 10 versions preserved
- [ ] Privacy levels work (PRIVATE, CONNECTIONS, PUBLIC)
- [ ] Notes appear in profile panel
- [ ] Auto-save with 2s debounce (INV-A010)
- [ ] Type check passes
- [ ] Lint passes
- [ ] INV-D006 verified (version history)

---

*Created: 2026-01-13*
