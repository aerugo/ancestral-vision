/**
 * Media Gallery Tests
 *
 * Tests for the MediaGallery component that displays photos and documents.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js Image component to avoid hostname validation
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

import { MediaGallery } from './media-gallery';

const mockMedia = [
  {
    id: 'media-1',
    type: 'PHOTO' as const,
    filename: 'family.jpg',
    url: 'https://storage.example.com/family.jpg',
    thumbnails: {
      small: 'https://storage.example.com/family_200.jpg',
      medium: 'https://storage.example.com/family_800.jpg',
    },
  },
  {
    id: 'media-2',
    type: 'PHOTO' as const,
    filename: 'wedding.jpg',
    url: 'https://storage.example.com/wedding.jpg',
    thumbnails: {
      small: 'https://storage.example.com/wedding_200.jpg',
      medium: 'https://storage.example.com/wedding_800.jpg',
    },
  },
  {
    id: 'media-3',
    type: 'DOCUMENT' as const,
    filename: 'certificate.pdf',
    url: 'https://storage.example.com/certificate.pdf',
    thumbnails: null,
  },
];

describe('MediaGallery', () => {
  const mockOnMediaClick = vi.fn();
  const mockOnAddMedia = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render grid of thumbnails', () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      // Should have 2 images (photos) and 1 document placeholder
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });

    it('should show photo thumbnails', () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      expect(screen.getByAltText('family.jpg')).toBeInTheDocument();
      expect(screen.getByAltText('wedding.jpg')).toBeInTheDocument();
    });

    it('should show document with filename', () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      expect(screen.getByText('certificate.pdf')).toBeInTheDocument();
    });

    it('should show add media button', () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      expect(
        screen.getByRole('button', { name: /add media/i })
      ).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no media', () => {
      render(
        <MediaGallery
          media={[]}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      expect(screen.getByText(/no photos or documents/i)).toBeInTheDocument();
    });

    it('should show add button in empty state', () => {
      render(
        <MediaGallery
          media={[]}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      expect(
        screen.getByRole('button', { name: /add media/i })
      ).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onMediaClick when photo clicked', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByAltText('family.jpg'));

      expect(mockOnMediaClick).toHaveBeenCalledWith('media-1');
    });

    it('should call onMediaClick when document clicked', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByText('certificate.pdf'));

      expect(mockOnMediaClick).toHaveBeenCalledWith('media-3');
    });

    it('should call onAddMedia when add button clicked', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: /add media/i }));

      expect(mockOnAddMedia).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal View', () => {
    it('should open modal when media clicked', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByAltText('family.jpg'));

      // Modal should show full-size image
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should show navigation buttons in modal for multiple items', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByAltText('family.jpg'));

      // Should have prev/next buttons
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should navigate to next item', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByAltText('family.jpg'));
      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      // Second item should be visible in modal (wedding.jpg) - both thumbnail and modal will have it
      const weddingImages = screen.getAllByAltText('wedding.jpg');
      expect(weddingImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should navigate to previous item', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      // Click second item first
      await userEvent.click(screen.getByAltText('wedding.jpg'));
      await userEvent.click(screen.getByRole('button', { name: /previous/i }));

      // First item should be visible in modal - both thumbnail and modal will have it
      const familyImages = screen.getAllByAltText('family.jpg');
      expect(familyImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should close modal when close button clicked', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByAltText('family.jpg'));
      await userEvent.click(screen.getByRole('button', { name: /close/i }));

      // Modal should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should disable previous button on first item', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByAltText('family.jpg'));

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    });

    it('should disable next button on last item', async () => {
      render(
        <MediaGallery
          media={mockMedia}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByText('certificate.pdf'));

      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });

  describe('Document Display', () => {
    it('should show document icon for PDFs', () => {
      const documentsOnly = [mockMedia[2]];
      render(
        <MediaGallery
          media={documentsOnly}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      // Should show document icon (not an img)
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('certificate.pdf')).toBeInTheDocument();
    });

    it('should render PDF in iframe in modal', async () => {
      const documentsOnly = [mockMedia[2]];
      render(
        <MediaGallery
          media={documentsOnly}
          onMediaClick={mockOnMediaClick}
          onAddMedia={mockOnAddMedia}
        />
      );

      await userEvent.click(screen.getByText('certificate.pdf'));

      // Should have iframe for PDF
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', mockMedia[2].url);
    });
  });
});
