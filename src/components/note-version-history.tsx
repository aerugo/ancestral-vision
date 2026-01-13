'use client';

import * as React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { History, RotateCcw, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoteVersion {
  version: number;
  content: string;
  updatedAt: string;
}

interface NoteVersionHistoryProps {
  currentVersion: number;
  previousVersions: NoteVersion[];
  onRestore: (version: NoteVersion) => void;
  onClose: () => void;
}

function extractText(content: string): string {
  try {
    const json = JSON.parse(content);
    const extract = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';
      const obj = node as Record<string, unknown>;
      if (obj.text && typeof obj.text === 'string') return obj.text;
      if (Array.isArray(obj.content)) {
        return obj.content.map(extract).join(' ');
      }
      return '';
    };
    return extract(json);
  } catch {
    return content;
  }
}

export function NoteVersionHistory({
  currentVersion,
  previousVersions,
  onRestore,
  onClose,
}: NoteVersionHistoryProps): React.ReactElement {
  const [selectedVersion, setSelectedVersion] =
    React.useState<NoteVersion | null>(null);
  const [restoreVersion, setRestoreVersion] =
    React.useState<NoteVersion | null>(null);

  const handleRestore = () => {
    if (restoreVersion) {
      onRestore(restoreVersion);
      setRestoreVersion(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-medium">Version History</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Version List */}
        <div className="w-64 border-r overflow-y-auto">
          <div className="p-2 space-y-1">
            {/* Current version */}
            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="font-medium">Version {currentVersion}</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Current
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Now</span>
            </div>

            {/* Previous versions */}
            {previousVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                No previous versions
              </p>
            ) : (
              previousVersions.map((version) => (
                <button
                  key={version.version}
                  onClick={() => setSelectedVersion(version)}
                  className={`w-full p-3 rounded-md text-left hover:bg-muted/50 transition-colors ${
                    selectedVersion?.version === version.version ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Version {version.version}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(version.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col">
          {selectedVersion ? (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    Version {selectedVersion.version}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedVersion.updatedAt), 'PPpp')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setRestoreVersion(selectedVersion)}
                  aria-label="Restore"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-muted-foreground">
                    {extractText(selectedVersion.content)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a version to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      {restoreVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Restore this version?</h3>
            <p className="text-muted-foreground mb-4">
              This will restore Version {restoreVersion.version} as a new
              version. Your current content will be saved in version history.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRestoreVersion(null)}>
                Cancel
              </Button>
              <Button onClick={handleRestore} aria-label="Confirm">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
