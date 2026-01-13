/**
 * Storage Utils Tests
 *
 * Tests for Cloud Storage utilities including path generation,
 * signed URLs, file validation, and duplicate detection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mocks that can be referenced in vi.mock
const { mockGetSignedUrl, mockFile, mockBucket } = vi.hoisted(() => {
  const mockGetSignedUrl = vi.fn().mockResolvedValue(['https://signed-url.example.com']);
  const mockFile = vi.fn().mockReturnValue({
    getSignedUrl: mockGetSignedUrl,
    exists: vi.fn().mockResolvedValue([false]),
  });
  const mockBucket = vi.fn().mockReturnValue({
    file: mockFile,
  });
  return { mockGetSignedUrl, mockFile, mockBucket };
});

vi.mock('@google-cloud/storage', () => ({
  Storage: class MockStorage {
    bucket = mockBucket;
  },
}));

import {
  generateStoragePath,
  generateUploadUrl,
  generateDownloadUrl,
  calculateFileHash,
  validateMediaFile,
  getMediaTypeFromMime,
  checkDuplicate,
  type StoragePathParams,
} from './storage';

describe('Storage Utils', () => {
  describe('generateStoragePath', () => {
    it('should generate correct storage path for photo', () => {
      const params: StoragePathParams = {
        userId: 'user-123',
        mediaType: 'PHOTO',
        mediaId: 'media-456',
        extension: 'jpg',
      };

      const path = generateStoragePath(params);

      expect(path).toBe('users/user-123/media/photo/media-456.jpg');
    });

    it('should generate correct storage path for document', () => {
      const params: StoragePathParams = {
        userId: 'user-abc',
        mediaType: 'DOCUMENT',
        mediaId: 'doc-789',
        extension: 'pdf',
      };

      const path = generateStoragePath(params);

      expect(path).toBe('users/user-abc/media/document/doc-789.pdf');
    });

    it('should generate correct storage path for audio', () => {
      const params: StoragePathParams = {
        userId: 'user-xyz',
        mediaType: 'AUDIO',
        mediaId: 'audio-123',
        extension: 'mp3',
      };

      const path = generateStoragePath(params);

      expect(path).toBe('users/user-xyz/media/audio/audio-123.mp3');
    });
  });

  describe('getMediaTypeFromMime', () => {
    it('should return PHOTO for jpeg', () => {
      expect(getMediaTypeFromMime('image/jpeg')).toBe('PHOTO');
    });

    it('should return PHOTO for png', () => {
      expect(getMediaTypeFromMime('image/png')).toBe('PHOTO');
    });

    it('should return PHOTO for webp', () => {
      expect(getMediaTypeFromMime('image/webp')).toBe('PHOTO');
    });

    it('should return PHOTO for heic', () => {
      expect(getMediaTypeFromMime('image/heic')).toBe('PHOTO');
    });

    it('should return DOCUMENT for pdf', () => {
      expect(getMediaTypeFromMime('application/pdf')).toBe('DOCUMENT');
    });

    it('should return AUDIO for mp3', () => {
      expect(getMediaTypeFromMime('audio/mpeg')).toBe('AUDIO');
    });

    it('should return AUDIO for wav', () => {
      expect(getMediaTypeFromMime('audio/wav')).toBe('AUDIO');
    });

    it('should return null for unsupported types', () => {
      expect(getMediaTypeFromMime('application/exe')).toBeNull();
      expect(getMediaTypeFromMime('video/mp4')).toBeNull();
      expect(getMediaTypeFromMime('text/plain')).toBeNull();
    });
  });

  describe('validateMediaFile', () => {
    it('should validate correct jpeg file', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'image/jpeg', size: 1000000 })
      ).not.toThrow();
    });

    it('should validate correct png file', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'image/png', size: 5000000 })
      ).not.toThrow();
    });

    it('should validate correct pdf file', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'application/pdf', size: 10000000 })
      ).not.toThrow();
    });

    it('should reject unsupported file types', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'application/exe', size: 1000000 })
      ).toThrow('Unsupported file type');
    });

    it('should reject video files', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'video/mp4', size: 1000000 })
      ).toThrow('Unsupported file type');
    });

    it('should reject files exceeding 25MB limit', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'image/jpeg', size: 30 * 1024 * 1024 })
      ).toThrow('File exceeds 25MB limit');
    });

    it('should accept files at exactly 25MB', () => {
      expect(() =>
        validateMediaFile({ mimeType: 'image/jpeg', size: 25 * 1024 * 1024 })
      ).not.toThrow();
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate signed URL for upload', async () => {
      const url = await generateUploadUrl('users/test/media/photo/test.jpg');

      expect(url).toBe('https://signed-url.example.com');
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate signed URL for download', async () => {
      const url = await generateDownloadUrl('users/test/media/photo/test.jpg');

      expect(url).toBe('https://signed-url.example.com');
    });
  });

  describe('calculateFileHash', () => {
    it('should calculate SHA-256 hash of buffer', () => {
      const buffer = Buffer.from('test content');
      const hash = calculateFileHash(buffer);

      // SHA-256 hash should be 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should return consistent hash for same content', () => {
      const buffer1 = Buffer.from('identical content');
      const buffer2 = Buffer.from('identical content');

      expect(calculateFileHash(buffer1)).toBe(calculateFileHash(buffer2));
    });

    it('should return different hash for different content', () => {
      const buffer1 = Buffer.from('content A');
      const buffer2 = Buffer.from('content B');

      expect(calculateFileHash(buffer1)).not.toBe(calculateFileHash(buffer2));
    });
  });

  describe('checkDuplicate', () => {
    const mockPrisma = {
      media: {
        findFirst: vi.fn(),
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return isDuplicate false when no match found', async () => {
      mockPrisma.media.findFirst.mockResolvedValue(null);

      const result = await checkDuplicate(
        mockPrisma as any,
        'constellation-1',
        'abc123hash'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.mediaId).toBeUndefined();
    });

    it('should return isDuplicate true with mediaId when match found', async () => {
      mockPrisma.media.findFirst.mockResolvedValue({
        id: 'existing-media-id',
        hash: 'abc123hash',
      });

      const result = await checkDuplicate(
        mockPrisma as any,
        'constellation-1',
        'abc123hash'
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.mediaId).toBe('existing-media-id');
    });

    it('should query with correct parameters', async () => {
      mockPrisma.media.findFirst.mockResolvedValue(null);

      await checkDuplicate(mockPrisma as any, 'constellation-xyz', 'hash123');

      expect(mockPrisma.media.findFirst).toHaveBeenCalledWith({
        where: {
          constellationId: 'constellation-xyz',
          hash: 'hash123',
          deletedAt: null,
        },
      });
    });
  });
});
