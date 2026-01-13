/**
 * MediaGallery Component
 *
 * Grid display of photos and documents with modal viewer.
 */
'use client';

import { useState, type ReactElement } from 'react';
import Image from 'next/image';
import { FileText, Plus, ChevronLeft, ChevronRight, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

/**
 * MediaGallery - Grid gallery with modal viewer
 *
 * Features:
 * - Grid thumbnail layout
 * - Full-size modal viewer
 * - Navigation between items
 * - Document/PDF support via iframe
 * - Empty state with add prompt
 */
export function MediaGallery({
  media,
  onMediaClick,
  onAddMedia,
}: MediaGalleryProps): ReactElement {
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

  const handleClose = () => {
    setViewingIndex(null);
  };

  const handleItemClick = (index: number) => {
    setViewingIndex(index);
    onMediaClick(media[index].id);
  };

  // Empty state
  if (media.length === 0) {
    return (
      <div className="text-center py-8">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
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
              onClick={() => handleItemClick(index)}
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

      {/* Modal Viewer */}
      {viewingIndex !== null && viewingMedia && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Content */}
          <div className="relative w-full h-full flex items-center justify-center p-16">
            {viewingMedia.type === 'PHOTO' ? (
              <Image
                src={viewingMedia.url}
                alt={viewingMedia.filename}
                fill
                className="object-contain"
              />
            ) : (
              <iframe
                src={viewingMedia.url}
                className="w-full h-full bg-white rounded"
                title={viewingMedia.filename}
              />
            )}
          </div>

          {/* Navigation */}
          {media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={handlePrev}
                disabled={viewingIndex === 0}
                aria-label="Previous"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={handleNext}
                disabled={viewingIndex === media.length - 1}
                aria-label="Next"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {viewingIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  );
}
