/**
 * PersonMediaTab Tests
 *
 * Tests for the PersonMediaTab component that manages media for a person.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonMediaTab } from './person-media-tab';
import * as mediaHooks from '@/hooks/use-media';

// Mock the media hooks
vi.mock('@/hooks/use-media');

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

const mockMedia = [
  {
    id: 'media-1',
    type: 'PHOTO' as const,
    filename: 'family.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024000,
    url: 'https://storage.example.com/family.jpg',
    thumbnails: {
      small: 'https://storage.example.com/family_200.jpg',
      medium: 'https://storage.example.com/family_800.jpg',
    },
    title: 'Family Photo',
    description: null,
    privacy: 'PRIVATE' as const,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'media-2',
    type: 'DOCUMENT' as const,
    filename: 'certificate.pdf',
    mimeType: 'application/pdf',
    fileSize: 512000,
    url: 'https://storage.example.com/certificate.pdf',
    thumbnails: null,
    title: 'Birth Certificate',
    description: 'Original copy',
    privacy: 'PRIVATE' as const,
    createdAt: '2024-01-10T08:00:00Z',
  },
];

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
}

describe('PersonMediaTab', () => {
  const mockPersonId = 'person-1';
  const mockDeleteMedia = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default hook implementations
    vi.mocked(mediaHooks.usePersonMedia).mockReturnValue({
      data: mockMedia,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof mediaHooks.usePersonMedia>);

    vi.mocked(mediaHooks.useDeleteMedia).mockReturnValue({
      mutate: mockDeleteMedia,
      isPending: false,
    } as unknown as ReturnType<typeof mediaHooks.useDeleteMedia>);
  });

  describe('Loading State', () => {
    it('should show loading indicator when media is loading', () => {
      vi.mocked(mediaHooks.usePersonMedia).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as ReturnType<typeof mediaHooks.usePersonMedia>);

      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', () => {
      vi.mocked(mediaHooks.usePersonMedia).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as ReturnType<typeof mediaHooks.usePersonMedia>);

      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      expect(screen.getByText(/error.*loading/i)).toBeInTheDocument();
    });
  });

  describe('Gallery View', () => {
    it('should render media gallery with photos', () => {
      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      expect(screen.getByAltText('family.jpg')).toBeInTheDocument();
    });

    it('should render media gallery with documents', () => {
      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      expect(screen.getByText('certificate.pdf')).toBeInTheDocument();
    });

    it('should show add media button', () => {
      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      expect(screen.getByRole('button', { name: /add.*media/i })).toBeInTheDocument();
    });

    it('should show empty state when no media', () => {
      vi.mocked(mediaHooks.usePersonMedia).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof mediaHooks.usePersonMedia>);

      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      expect(screen.getByText(/no photos or documents/i)).toBeInTheDocument();
    });
  });

  describe('Upload View', () => {
    it('should show uploader when add button clicked', async () => {
      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*media/i }));

      expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    });

    it('should show back button in upload view', async () => {
      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*media/i }));

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should return to gallery when back clicked', async () => {
      renderWithQueryClient(<PersonMediaTab personId={mockPersonId} />);

      await userEvent.click(screen.getByRole('button', { name: /add.*media/i }));
      await userEvent.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByAltText('family.jpg')).toBeInTheDocument();
    });
  });
});
