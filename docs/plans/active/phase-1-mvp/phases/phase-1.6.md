# Phase 1.6: Media System

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Implement photo and document upload with Cloud Storage integration, thumbnail generation, signed URL access, duplicate detection, and gallery display in the profile panel.

---

## Invariants Enforced in This Phase

- **INV-D001**: Entity IDs are UUID v4 - Media IDs
- **INV-D005**: Soft Delete with 30-Day Recovery - Media uses deletedAt
- **INV-S001**: All GraphQL Mutations Require Authentication
- **INV-S002**: Users Can Only Access Their Own Constellation
- **INV-S003**: Firebase Admin SDK is Server-Only - Storage operations server-side
- **INV-A005**: TanStack Query for Server State
- **NEW INV-D008**: Media files stored in Cloud Storage with signed URLs

---

## TDD Steps

### Step 1.6.1: Write Storage Utils Tests (RED)

Create `src/lib/storage.test.ts`:

**Test Cases**:

1. `it('should generate correct storage path')` - Path format
2. `it('should generate signed URL for upload')` - Upload URL
3. `it('should generate signed URL for download')` - Access URL
4. `it('should set correct expiry on signed URLs')` - 1hr expiry
5. `it('should calculate SHA-256 hash')` - Duplicate detection
6. `it('should validate file type')` - MIME type check
7. `it('should validate file size')` - 25MB limit
8. `it('should detect duplicate by hash')` - Hash lookup

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateStoragePath,
  generateUploadUrl,
  generateDownloadUrl,
  calculateFileHash,
  validateMediaFile,
  checkDuplicate,
} from './storage';

// Mock GCS
vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        getSignedUrl: vi.fn().mockResolvedValue(['https://signed-url.example.com']),
        exists: vi.fn().mockResolvedValue([false]),
      }),
    }),
  })),
}));

describe('Storage Utils', () => {
  describe('generateStoragePath', () => {
    it('should generate correct storage path', () => {
      const path = generateStoragePath({
        userId: 'user-123',
        mediaType: 'PHOTO',
        mediaId: 'media-456',
        extension: 'jpg',
      });

      expect(path).toBe('users/user-123/media/photo/media-456.jpg');
    });
  });

  describe('validateMediaFile', () => {
    it('should validate file type', () => {
      expect(() => validateMediaFile({
        mimeType: 'image/jpeg',
        size: 1000000,
      })).not.toThrow();

      expect(() => validateMediaFile({
        mimeType: 'application/exe',
        size: 1000000,
      })).toThrow('Unsupported file type');
    });

    it('should validate file size', () => {
      expect(() => validateMediaFile({
        mimeType: 'image/jpeg',
        size: 30 * 1024 * 1024, // 30MB
      })).toThrow('File exceeds 25MB limit');
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate signed URL with 1hr expiry', async () => {
      const url = await generateDownloadUrl('users/test/media/photo/test.jpg');

      expect(url).toBe('https://signed-url.example.com');
    });
  });

  // ... more tests
});
```

### Step 1.6.2: Write Media GraphQL Tests (RED)

Create `src/graphql/resolvers/media.test.ts`:

**Test Cases**:

1. `it('should return media for a person')` - Query personMedia
2. `it('should return empty array for unauthenticated')` - Auth check
3. `it('should prepare media upload')` - prepareMediaUpload mutation
4. `it('should confirm media upload')` - confirmMediaUpload mutation
5. `it('should require authentication')` - Auth error
6. `it('should validate file type')` - Allowed types only
7. `it('should validate file size')` - 25MB limit
8. `it('should detect duplicate by hash')` - Duplicate warning
9. `it('should associate media with person')` - Person link
10. `it('should associate media with multiple people')` - Multi-person
11. `it('should soft delete media')` - deleteMedia sets deletedAt
12. `it('should return signed URLs')` - URL generation

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestData } from '@/tests/graphql-test-utils';
import { gql } from 'graphql-tag';

const PREPARE_UPLOAD = gql`
  mutation PrepareMediaUpload($input: PrepareMediaUploadInput!) {
    prepareMediaUpload(input: $input) {
      mediaId
      uploadUrl
      isDuplicate
      duplicateMediaId
    }
  }
`;

const CONFIRM_UPLOAD = gql`
  mutation ConfirmMediaUpload($input: ConfirmMediaUploadInput!) {
    confirmMediaUpload(input: $input) {
      id
      type
      filename
      storagePath
      thumbnails
    }
  }
`;

const PERSON_MEDIA = gql`
  query PersonMedia($personId: ID!) {
    personMedia(personId: $personId) {
      id
      type
      filename
      url
      thumbnails
      createdAt
    }
  }
`;

describe('Media Resolvers', () => {
  // ... setup and tests
});
```

### Step 1.6.3: Write Media Hooks Tests (RED)

Create `src/hooks/use-media.test.ts`:

**Test Cases**:

1. `it('should fetch media for a person')` - usePersonMedia
2. `it('should prepare upload')` - usePrepareMediaUpload
3. `it('should confirm upload')` - useConfirmMediaUpload
4. `it('should delete media')` - useDeleteMedia
5. `it('should associate media with person')` - useAssociateMedia
6. `it('should handle loading state')` - isLoading
7. `it('should handle upload progress')` - Progress tracking

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePersonMedia,
  usePrepareMediaUpload,
  useConfirmMediaUpload,
  useDeleteMedia,
} from './use-media';

vi.mock('@/lib/graphql-client');

describe('Media Hooks', () => {
  // ... tests
});
```

### Step 1.6.4: Write Media Uploader Tests (RED)

Create `src/components/media-uploader.test.tsx`:

**Test Cases**:

1. `it('should render dropzone')` - Drag & drop area
2. `it('should accept files via click')` - File input
3. `it('should accept files via drag')` - Drag and drop
4. `it('should show file preview')` - Thumbnail preview
5. `it('should validate file type')` - Reject invalid types
6. `it('should validate file size')` - Reject oversized
7. `it('should show upload progress')` - Progress bar
8. `it('should warn on duplicate')` - Duplicate detection
9. `it('should allow override for duplicate')` - Force upload
10. `it('should call onUploadComplete')` - Success callback
11. `it('should handle upload error')` - Error display

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaUploader } from './media-uploader';

describe('MediaUploader', () => {
  const mockOnUploadComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dropzone', () => {
    render(<MediaUploader onUploadComplete={mockOnUploadComplete} personId="person-1" />);

    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('should validate file type', async () => {
    render(<MediaUploader onUploadComplete={mockOnUploadComplete} personId="person-1" />);

    const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it('should validate file size', async () => {
    render(<MediaUploader onUploadComplete={mockOnUploadComplete} personId="person-1" />);

    // Create a 30MB mock file
    const largeFile = new File(['x'.repeat(30 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

    await userEvent.upload(input, largeFile);

    expect(screen.getByText(/file exceeds 25mb limit/i)).toBeInTheDocument();
  });

  // ... more tests
});
```

### Step 1.6.5: Write Media Gallery Tests (RED)

Create `src/components/media-gallery.test.tsx`:

**Test Cases**:

1. `it('should render grid of thumbnails')` - Grid layout
2. `it('should show photo type indicator')` - Type badge
3. `it('should show document type indicator')` - PDF icon
4. `it('should open modal on click')` - Full-size view
5. `it('should show image in modal')` - Large image
6. `it('should show PDF in modal')` - Document viewer
7. `it('should navigate between items')` - Prev/next
8. `it('should close modal')` - Close button
9. `it('should handle empty state')` - No media message
10. `it('should show upload button')` - Add media

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaGallery } from './media-gallery';

const mockMedia = [
  {
    id: 'media-1',
    type: 'PHOTO',
    filename: 'family.jpg',
    url: 'https://storage.example.com/family.jpg',
    thumbnails: { small: 'https://storage.example.com/family_200.jpg' },
  },
  {
    id: 'media-2',
    type: 'DOCUMENT',
    filename: 'certificate.pdf',
    url: 'https://storage.example.com/certificate.pdf',
    thumbnails: null,
  },
];

describe('MediaGallery', () => {
  it('should render grid of thumbnails', () => {
    render(<MediaGallery media={mockMedia} onMediaClick={vi.fn()} />);

    expect(screen.getAllByRole('img')).toHaveLength(1); // Only photo has img
    expect(screen.getByText('certificate.pdf')).toBeInTheDocument();
  });

  it('should open modal on click', async () => {
    const mockOnClick = vi.fn();
    render(<MediaGallery media={mockMedia} onMediaClick={mockOnClick} />);

    await userEvent.click(screen.getByAltText('family.jpg'));

    expect(mockOnClick).toHaveBeenCalledWith('media-1');
  });

  it('should handle empty state', () => {
    render(<MediaGallery media={[]} onMediaClick={vi.fn()} />);

    expect(screen.getByText(/no photos or documents/i)).toBeInTheDocument();
  });

  // ... more tests
});
```

### Step 1.6.6: Implement Storage Utils (GREEN)

Create `src/lib/storage.ts`:

```typescript
import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ancestral-vision-media';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SIGNED_URL_EXPIRY = 60 * 60 * 1000; // 1 hour

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  PHOTO: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  DOCUMENT: ['application/pdf'],
  AUDIO: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'],
};

interface StoragePathParams {
  userId: string;
  mediaType: 'PHOTO' | 'DOCUMENT' | 'AUDIO';
  mediaId: string;
  extension: string;
}

export function generateStoragePath(params: StoragePathParams): string {
  const { userId, mediaType, mediaId, extension } = params;
  return `users/${userId}/media/${mediaType.toLowerCase()}/${mediaId}.${extension}`;
}

export function getMediaTypeFromMime(mimeType: string): 'PHOTO' | 'DOCUMENT' | 'AUDIO' | null {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as 'PHOTO' | 'DOCUMENT' | 'AUDIO';
    }
  }
  return null;
}

export function validateMediaFile(file: { mimeType: string; size: number }): void {
  const mediaType = getMediaTypeFromMime(file.mimeType);
  if (!mediaType) {
    throw new Error('Unsupported file type');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds 25MB limit');
  }
}

export async function generateUploadUrl(storagePath: string): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + SIGNED_URL_EXPIRY,
    contentType: 'application/octet-stream',
  });

  return url;
}

export async function generateDownloadUrl(storagePath: string): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + SIGNED_URL_EXPIRY,
  });

  return url;
}

export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function checkDuplicate(
  prisma: PrismaClient,
  constellationId: string,
  hash: string
): Promise<{ isDuplicate: boolean; mediaId?: string }> {
  const existing = await prisma.media.findFirst({
    where: { constellationId, hash, deletedAt: null },
  });

  return {
    isDuplicate: !!existing,
    mediaId: existing?.id,
  };
}

export async function generateThumbnails(
  storagePath: string,
  mimeType: string
): Promise<{ small: string; medium: string } | null> {
  // Only generate thumbnails for images
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  // In production, this would use Cloud Functions or a processing service
  // For now, return paths that would be generated
  const basePath = storagePath.replace(/\.[^.]+$/, '');
  const ext = 'webp';

  return {
    small: `${basePath}_200.${ext}`,
    medium: `${basePath}_800.${ext}`,
  };
}
```

### Step 1.6.7: Implement GraphQL Schema & Resolvers (GREEN)

Update `src/graphql/schema.ts`:

```typescript
// Add to typeDefs
type Media {
  id: ID!
  type: MediaType!
  filename: String!
  mimeType: String!
  fileSize: Int!
  url: String!
  thumbnails: JSON
  title: String
  description: String
  dateTaken: JSON
  privacy: PrivacyLevel!
  people: [Person!]!
  createdAt: DateTime!
}

type PrepareUploadResult {
  mediaId: ID!
  uploadUrl: String!
  isDuplicate: Boolean!
  duplicateMediaId: ID
}

enum MediaType {
  PHOTO
  DOCUMENT
  AUDIO
}

input PrepareMediaUploadInput {
  filename: String!
  mimeType: String!
  fileSize: Int!
  hash: String!
  personIds: [ID!]!
}

input ConfirmMediaUploadInput {
  mediaId: ID!
  title: String
  description: String
  dateTaken: JSON
  privacy: PrivacyLevel
}

extend type Query {
  personMedia(personId: ID!): [Media!]!
  media(id: ID!): Media
}

extend type Mutation {
  prepareMediaUpload(input: PrepareMediaUploadInput!): PrepareUploadResult!
  confirmMediaUpload(input: ConfirmMediaUploadInput!): Media!
  deleteMedia(id: ID!): Media!
  associateMediaWithPerson(mediaId: ID!, personId: ID!): Media!
  removeMediaFromPerson(mediaId: ID!, personId: ID!): Media!
}
```

Create `src/graphql/resolvers/media.ts`:

```typescript
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types';
import {
  generateStoragePath,
  generateUploadUrl,
  generateDownloadUrl,
  validateMediaFile,
  getMediaTypeFromMime,
  checkDuplicate,
  generateThumbnails,
} from '@/lib/storage';

export const mediaResolvers = {
  Query: {
    personMedia: async (_: unknown, { personId }: { personId: string }, ctx: GraphQLContext) => {
      if (!ctx.user) return [];

      const person = await ctx.prisma.person.findFirst({
        where: { id: personId, constellation: { ownerId: ctx.user.uid } },
      });
      if (!person) return [];

      const mediaPersons = await ctx.prisma.mediaPerson.findMany({
        where: { personId },
        include: { media: true },
      });

      return mediaPersons
        .map((mp) => mp.media)
        .filter((m) => !m.deletedAt);
    },
  },

  Mutation: {
    prepareMediaUpload: async (
      _: unknown,
      { input }: { input: PrepareMediaUploadInput },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      // Validate file
      validateMediaFile({ mimeType: input.mimeType, size: input.fileSize });

      // Get constellation
      const constellation = await ctx.prisma.constellation.findFirst({
        where: { ownerId: ctx.user!.uid },
      });
      if (!constellation) {
        throw new GraphQLError('Constellation not found');
      }

      // Check for duplicate
      const { isDuplicate, mediaId: duplicateMediaId } = await checkDuplicate(
        ctx.prisma,
        constellation.id,
        input.hash
      );

      // Create media record
      const mediaType = getMediaTypeFromMime(input.mimeType)!;
      const extension = input.filename.split('.').pop() || 'bin';
      const mediaId = crypto.randomUUID();

      const storagePath = generateStoragePath({
        userId: ctx.user!.uid,
        mediaType,
        mediaId,
        extension,
      });

      // Create pending media record
      await ctx.prisma.media.create({
        data: {
          id: mediaId,
          constellationId: constellation.id,
          type: mediaType,
          filename: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          storagePath,
          storageUrl: '', // Updated on confirm
          hash: input.hash,
          createdBy: ctx.user!.uid,
          people: {
            create: input.personIds.map((personId) => ({ personId })),
          },
        },
      });

      const uploadUrl = await generateUploadUrl(storagePath);

      return {
        mediaId,
        uploadUrl,
        isDuplicate,
        duplicateMediaId,
      };
    },

    confirmMediaUpload: async (
      _: unknown,
      { input }: { input: ConfirmMediaUploadInput },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);

      const media = await ctx.prisma.media.findFirst({
        where: { id: input.mediaId, constellation: { ownerId: ctx.user!.uid } },
      });

      if (!media) {
        throw new GraphQLError('Media not found');
      }

      // Generate thumbnails (async in production)
      const thumbnails = await generateThumbnails(media.storagePath, media.mimeType);

      return ctx.prisma.media.update({
        where: { id: input.mediaId },
        data: {
          title: input.title,
          description: input.description,
          dateTaken: input.dateTaken,
          privacy: input.privacy || 'PRIVATE',
          thumbnails,
          storageUrl: media.storagePath, // Mark as confirmed
        },
        include: { people: { include: { person: true } } },
      });
    },

    deleteMedia: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);

      const media = await ctx.prisma.media.findFirst({
        where: { id, constellation: { ownerId: ctx.user!.uid } },
      });

      if (!media) {
        throw new GraphQLError('Media not found');
      }

      return ctx.prisma.media.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },
  },

  Media: {
    url: async (media: Media, _: unknown, ctx: GraphQLContext) => {
      return generateDownloadUrl(media.storagePath);
    },

    people: async (media: Media, _: unknown, ctx: GraphQLContext) => {
      const mediaPersons = await ctx.prisma.mediaPerson.findMany({
        where: { mediaId: media.id },
        include: { person: true },
      });
      return mediaPersons.map((mp) => mp.person);
    },
  },
};
```

### Step 1.6.8: Implement Media Uploader Component (GREEN)

Create `src/components/media-uploader.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePrepareMediaUpload, useConfirmMediaUpload } from '@/hooks/use-media';

const MAX_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'application/pdf': ['.pdf'],
};

interface MediaUploaderProps {
  personId: string;
  onUploadComplete: (mediaId: string) => void;
  onClose?: () => void;
}

export function MediaUploader({
  personId,
  onUploadComplete,
  onClose,
}: MediaUploaderProps): JSX.Element {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const prepareUpload = usePrepareMediaUpload();
  const confirmUpload = useConfirmMediaUpload();

  const uploadFile = useCallback(async (file: File, force = false) => {
    setError(null);
    setUploadProgress(0);

    try {
      // Calculate hash
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Prepare upload
      const { mediaId, uploadUrl, isDuplicate: duplicate } = await prepareUpload.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        hash,
        personIds: [personId],
      });

      if (duplicate && !force) {
        setIsDuplicate(true);
        setPendingFile(file);
        return;
      }

      // Upload to GCS
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setUploadProgress(90);

      // Confirm upload
      await confirmUpload.mutateAsync({ mediaId });

      setUploadProgress(100);
      onUploadComplete(mediaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [personId, prepareUpload, confirmUpload, onUploadComplete]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      setError('File exceeds 25MB limit');
      return;
    }

    await uploadFile(file);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleForceUpload = () => {
    if (pendingFile) {
      setIsDuplicate(false);
      uploadFile(pendingFile, true);
    }
  };

  return (
    <div className="space-y-4">
      {isDuplicate ? (
        <div className="p-4 border rounded-lg bg-yellow-500/10 border-yellow-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">Duplicate file detected</p>
              <p className="text-sm text-muted-foreground mt-1">
                This file has already been uploaded. Do you want to upload it anyway?
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setIsDuplicate(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleForceUpload}>
                  Upload Anyway
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <input {...getInputProps()} aria-label="Upload file" />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">Drop files here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-2">
            JPEG, PNG, WebP, HEIC, PDF up to 25MB
          </p>
        </div>
      )}

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-center text-muted-foreground">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 border rounded-lg bg-destructive/10 border-destructive text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Step 1.6.9: Implement Media Gallery Component (GREEN)

Create `src/components/media-gallery.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FileText, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  type: 'PHOTO' | 'DOCUMENT' | 'AUDIO';
  filename: string;
  url: string;
  thumbnails: { small: string; medium: string } | null;
}

interface MediaGalleryProps {
  media: MediaItem[];
  onMediaClick: (mediaId: string) => void;
  onAddMedia: () => void;
}

export function MediaGallery({
  media,
  onMediaClick,
  onAddMedia,
}: MediaGalleryProps): JSX.Element {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const handlePrev = () => {
    if (viewingIndex !== null && viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1);
    }
  };

  const handleNext = () => {
    if (viewingIndex !== null && viewingIndex < media.length - 1) {
      setViewingIndex(viewingIndex + 1);
    }
  };

  if (media.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No photos or documents</p>
        <Button onClick={onAddMedia}>
          <Plus className="h-4 w-4 mr-2" />
          Add Media
        </Button>
      </div>
    );
  }

  const viewingMedia = viewingIndex !== null ? media[viewingIndex] : null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={onAddMedia} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Media
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {media.map((item, index) => (
            <button
              key={item.id}
              className="aspect-square relative rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
              onClick={() => {
                setViewingIndex(index);
                onMediaClick(item.id);
              }}
            >
              {item.type === 'PHOTO' && item.thumbnails ? (
                <Image
                  src={item.thumbnails.small}
                  alt={item.filename}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs mt-1 px-1 truncate w-full text-center">
                    {item.filename}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={viewingIndex !== null} onOpenChange={() => setViewingIndex(null)}>
        <DialogContent className="max-w-4xl p-0">
          {viewingMedia && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => setViewingIndex(null)}
              >
                <X className="h-4 w-4" />
              </Button>

              {viewingMedia.type === 'PHOTO' ? (
                <Image
                  src={viewingMedia.url}
                  alt={viewingMedia.filename}
                  width={1200}
                  height={800}
                  className="object-contain max-h-[80vh] w-auto mx-auto"
                />
              ) : (
                <iframe
                  src={viewingMedia.url}
                  className="w-full h-[80vh]"
                  title={viewingMedia.filename}
                />
              )}

              {media.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={handlePrev}
                    disabled={viewingIndex === 0}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleNext}
                    disabled={viewingIndex === media.length - 1}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/storage.ts` | CREATE | Cloud Storage utilities |
| `src/lib/storage.test.ts` | CREATE | Storage tests |
| `src/graphql/schema.ts` | MODIFY | Add Media types and operations |
| `src/graphql/resolvers/media.ts` | CREATE | Media resolver implementation |
| `src/graphql/resolvers/media.test.ts` | CREATE | Media resolver tests |
| `src/hooks/use-media.ts` | CREATE | TanStack Query hooks |
| `src/hooks/use-media.test.ts` | CREATE | Hook tests |
| `src/components/media-uploader.tsx` | CREATE | Drag & drop uploader |
| `src/components/media-uploader.test.tsx` | CREATE | Uploader tests |
| `src/components/media-gallery.tsx` | CREATE | Grid gallery with modal |
| `src/components/media-gallery.test.tsx` | CREATE | Gallery tests |
| `src/components/person-profile-panel.tsx` | MODIFY | Add Photos tab |

---

## Verification

```bash
# Run specific tests
npx vitest run src/lib/storage.test.ts
npx vitest run src/graphql/resolvers/media.test.ts
npx vitest run src/components/media-uploader.test.tsx
npx vitest run src/components/media-gallery.test.tsx

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Completion Criteria

- [ ] All ~20 media tests pass
- [ ] Can upload photos (JPEG, PNG, WebP, HEIC)
- [ ] Can upload documents (PDF)
- [ ] 25MB size limit enforced
- [ ] Duplicate detection warns user
- [ ] Thumbnails generated for images
- [ ] Signed URLs for private media (1hr expiry)
- [ ] Gallery displays in profile panel
- [ ] Modal viewer for full-size images
- [ ] Type check passes
- [ ] Lint passes
- [ ] INV-D008 verified (Cloud Storage + signed URLs)

---

*Created: 2026-01-13*
