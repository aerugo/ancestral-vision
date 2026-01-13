/**
 * Media Uploader Tests
 *
 * Tests for the MediaUploader component with drag and drop, validation, and upload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MediaUploader } from './media-uploader';
import * as mediaHooks from '@/hooks/use-media';

// Mock the media hooks
vi.mock('@/hooks/use-media');

// Polyfill File.prototype.arrayBuffer for JSDOM
if (!File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock crypto.subtle.digest
const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
  },
});

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

describe('MediaUploader', () => {
  const mockOnUploadComplete = vi.fn();
  const mockOnClose = vi.fn();
  const mockPrepareUpload = vi.fn();
  const mockConfirmUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default hook implementations
    vi.mocked(mediaHooks.usePrepareMediaUpload).mockReturnValue({
      mutateAsync: mockPrepareUpload,
      isPending: false,
    } as unknown as ReturnType<typeof mediaHooks.usePrepareMediaUpload>);

    vi.mocked(mediaHooks.useConfirmMediaUpload).mockReturnValue({
      mutateAsync: mockConfirmUpload,
      isPending: false,
    } as unknown as ReturnType<typeof mediaHooks.useConfirmMediaUpload>);

    mockPrepareUpload.mockResolvedValue({
      mediaId: 'new-media-id',
      uploadUrl: 'https://storage.example.com/upload',
      isDuplicate: false,
      duplicateMediaId: null,
    });

    mockConfirmUpload.mockResolvedValue({
      id: 'new-media-id',
      type: 'PHOTO',
    });

    // Mock fetch for upload
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  describe('Rendering', () => {
    it('should render dropzone', () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
    });

    it('should show accepted file types', () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      expect(screen.getByText(/jpeg.*png.*webp.*heic.*pdf/i)).toBeInTheDocument();
    });

    it('should show size limit', () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      expect(screen.getByText(/25mb/i)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should accept files via click', async () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['test image content'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockPrepareUpload).toHaveBeenCalled();
      });
    });
  });

  describe('Validation', () => {
    it('should reject unsupported file types', async () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['executable content'], 'malware.exe', {
        type: 'application/x-msdownload',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      // Should show error or not call upload
      expect(mockPrepareUpload).not.toHaveBeenCalled();
    });

    it('should reject files exceeding 25MB limit', async () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      // Create a mock file larger than 25MB
      const largeContent = new Array(30 * 1024 * 1024).fill('x').join('');
      const file = new File([largeContent], 'large.jpg', {
        type: 'image/jpeg',
      });

      // We need to mock the file size since File constructor doesn't respect content size in tests
      Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 });

      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/exceeds 25mb/i)).toBeInTheDocument();
      });
    });
  });

  describe('Duplicate Detection', () => {
    it('should show warning on duplicate file', async () => {
      mockPrepareUpload.mockResolvedValue({
        mediaId: 'new-media-id',
        uploadUrl: 'https://storage.example.com/upload',
        isDuplicate: true,
        duplicateMediaId: 'existing-media-id',
      });

      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['test content'], 'duplicate.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/duplicate.*detected/i)).toBeInTheDocument();
      });
    });

    it('should allow force upload of duplicate', async () => {
      mockPrepareUpload.mockResolvedValue({
        mediaId: 'new-media-id',
        uploadUrl: 'https://storage.example.com/upload',
        isDuplicate: true,
        duplicateMediaId: 'existing-media-id',
      });

      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['test content'], 'duplicate.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/upload anyway/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/upload anyway/i));

      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith('new-media-id');
      });
    });
  });

  describe('Upload Progress', () => {
    it('should show progress during upload', async () => {
      // Slow down the upload to see progress
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['test content'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      // Progress indicator should appear during upload
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success', () => {
    it('should call onUploadComplete on successful upload', async () => {
      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['test content'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalledWith('new-media-id');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on upload failure', async () => {
      mockPrepareUpload.mockRejectedValue(new Error('Network error'));

      renderWithQueryClient(
        <MediaUploader
          personId="person-1"
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(['test content'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const input = screen.getByLabelText(/upload/i) as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});
