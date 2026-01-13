/**
 * MediaUploader Component
 *
 * Drag and drop file uploader with validation, duplicate detection, and progress.
 */
'use client';

import { useState, useCallback, type ReactElement } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrepareMediaUpload, useConfirmMediaUpload } from '@/hooks/use-media';

const MAX_SIZE = 25 * 1024 * 1024; // 25MB
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

/**
 * MediaUploader - Drag and drop uploader with validation
 *
 * Features:
 * - Drag and drop support
 * - File type validation (JPEG, PNG, WebP, HEIC, PDF)
 * - 25MB size limit
 * - Duplicate detection with override option
 * - Upload progress indicator
 */
export function MediaUploader({
  personId,
  onUploadComplete,
  onClose,
}: MediaUploaderProps): ReactElement {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const prepareUpload = usePrepareMediaUpload();
  const confirmUpload = useConfirmMediaUpload();

  const uploadFile = useCallback(
    async (file: File, force = false) => {
      setError(null);
      setUploadProgress(0);
      setIsUploading(true);

      try {
        // Calculate hash using Web Crypto API
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        setUploadProgress(20);

        // Prepare upload
        const {
          mediaId,
          uploadUrl,
          isDuplicate: duplicate,
        } = await prepareUpload.mutateAsync({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          hash,
          personIds: [personId],
        });

        if (duplicate && !force) {
          setIsDuplicate(true);
          setPendingFile(file);
          setIsUploading(false);
          return;
        }

        setUploadProgress(40);

        // Upload to Cloud Storage
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        setUploadProgress(80);

        // Confirm upload
        await confirmUpload.mutateAsync({ mediaId });

        setUploadProgress(100);
        onUploadComplete(mediaId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [personId, prepareUpload, confirmUpload, onUploadComplete]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: { file: File; errors: { code: string }[] }[]) => {
      // Handle rejections first
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some((e) => e.code === 'file-too-large')) {
          setError('File exceeds 25MB limit');
        } else if (rejection.errors.some((e) => e.code === 'file-invalid-type')) {
          setError('Unsupported file type');
        } else {
          setError('File could not be uploaded');
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      await uploadFile(file);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleForceUpload = async () => {
    if (pendingFile) {
      setIsDuplicate(false);
      await uploadFile(pendingFile, true);
    }
  };

  const handleCancelDuplicate = () => {
    setIsDuplicate(false);
    setPendingFile(null);
  };

  return (
    <div className="space-y-4">
      {isDuplicate ? (
        <div className="p-4 border rounded-lg bg-yellow-500/10 border-yellow-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Duplicate file detected</p>
              <p className="text-sm text-muted-foreground mt-1">
                This file has already been uploaded. Do you want to upload it
                anyway?
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={handleCancelDuplicate}>
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
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
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

      {isUploading && (
        <div className="space-y-2">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 border rounded-lg bg-destructive/10 border-destructive text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
