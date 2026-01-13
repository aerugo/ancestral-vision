/**
 * Storage Utils (INV-D008: Media files stored in Cloud Storage)
 *
 * Utilities for Cloud Storage operations including signed URLs,
 * file validation, hash calculation, and duplicate detection.
 */
import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ancestral-vision-media';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SIGNED_URL_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Allowed MIME types grouped by media type
 */
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  PHOTO: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  DOCUMENT: ['application/pdf'],
  AUDIO: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'],
};

export type MediaType = 'PHOTO' | 'DOCUMENT' | 'AUDIO';

export interface StoragePathParams {
  userId: string;
  mediaType: MediaType;
  mediaId: string;
  extension: string;
}

/**
 * Generate storage path for a media file
 *
 * Format: users/{userId}/media/{type}/{mediaId}.{extension}
 */
export function generateStoragePath(params: StoragePathParams): string {
  const { userId, mediaType, mediaId, extension } = params;
  return `users/${userId}/media/${mediaType.toLowerCase()}/${mediaId}.${extension}`;
}

/**
 * Get media type from MIME type
 */
export function getMediaTypeFromMime(mimeType: string): MediaType | null {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as MediaType;
    }
  }
  return null;
}

/**
 * Validate media file type and size
 */
export function validateMediaFile(file: { mimeType: string; size: number }): void {
  const mediaType = getMediaTypeFromMime(file.mimeType);
  if (!mediaType) {
    throw new Error('Unsupported file type');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds 25MB limit');
  }
}

/**
 * Generate signed URL for file upload
 */
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

/**
 * Generate signed URL for file download
 */
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

/**
 * Calculate SHA-256 hash of file content
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if a file with the same hash already exists in the constellation
 */
export async function checkDuplicate(
  prisma: PrismaClient,
  constellationId: string,
  hash: string
): Promise<{ isDuplicate: boolean; mediaId?: string }> {
  const existing = await prisma.media.findFirst({
    where: {
      constellationId,
      hash,
      deletedAt: null,
    },
  });

  return {
    isDuplicate: !!existing,
    mediaId: existing?.id,
  };
}

/**
 * Generate thumbnail paths for an image
 *
 * Returns null for non-image media types.
 * In production, actual thumbnail generation would be handled by
 * Cloud Functions or a processing service.
 */
export async function generateThumbnails(
  storagePath: string,
  mimeType: string
): Promise<{ small: string; medium: string } | null> {
  // Only generate thumbnails for images
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  // Generate thumbnail paths (actual generation would happen async)
  const basePath = storagePath.replace(/\.[^.]+$/, '');
  const ext = 'webp';

  return {
    small: `${basePath}_200.${ext}`,
    medium: `${basePath}_800.${ext}`,
  };
}
