/**
 * PersonMediaTab Component
 *
 * Tab component for viewing and managing media (photos, documents) for a person.
 */
'use client';

import { useState, type ReactElement } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaGallery } from './media-gallery';
import { MediaUploader } from './media-uploader';
import { usePersonMedia } from '@/hooks/use-media';

interface PersonMediaTabProps {
  personId: string;
}

type ViewState = 'gallery' | 'upload';

/**
 * PersonMediaTab - Photos and documents tab for person profile
 *
 * Features:
 * - Grid gallery of photos and documents
 * - Upload new media with drag and drop
 * - Modal viewer for full-size images
 * - PDF viewer for documents
 */
export function PersonMediaTab({ personId }: PersonMediaTabProps): ReactElement {
  const [view, setView] = useState<ViewState>('gallery');
  const { data: media, isLoading, isError } = usePersonMedia(personId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading media...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">Error loading media</p>
      </div>
    );
  }

  const handleMediaClick = (mediaId: string) => {
    // Media click is handled by the gallery's internal modal
    console.log('Media clicked:', mediaId);
  };

  const handleAddMedia = () => {
    setView('upload');
  };

  const handleUploadComplete = (mediaId: string) => {
    setView('gallery');
    // The gallery will auto-refresh due to TanStack Query invalidation
    console.log('Upload complete:', mediaId);
  };

  if (view === 'upload') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('gallery')}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h3 className="font-medium">Upload Media</h3>
        </div>
        <MediaUploader
          personId={personId}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    );
  }

  // Transform media data for the gallery component
  const galleryMedia = (media || []).map((item) => ({
    id: item.id,
    type: item.type,
    filename: item.filename,
    url: item.url,
    thumbnails: item.thumbnails,
  }));

  return (
    <MediaGallery
      media={galleryMedia}
      onMediaClick={handleMediaClick}
      onAddMedia={handleAddMedia}
    />
  );
}
