/**
 * DangerZone Component
 *
 * Account deletion UI with confirmation dialog and 14-day grace period.
 */
'use client';

import { useState, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gql } from '@/lib/graphql-client';
import { useAuth } from '@/components/providers/auth-provider';

const REQUEST_DELETION_MUTATION = `
  mutation RequestAccountDeletion {
    requestAccountDeletion {
      success
      message
      scheduledDeletionDate
      isPending
    }
  }
`;

const CANCEL_DELETION_MUTATION = `
  mutation CancelAccountDeletion {
    cancelAccountDeletion {
      success
      message
      scheduledDeletionDate
      isPending
    }
  }
`;

interface DeletionResult {
  success: boolean;
  message: string;
  scheduledDeletionDate: string | null;
  isPending: boolean;
}

interface DangerZoneProps {
  deletionPending?: boolean;
  scheduledDeletionDate?: string | null;
}

/**
 * DangerZone - Account deletion section
 */
export function DangerZone({
  deletionPending = false,
  scheduledDeletionDate,
}: DangerZoneProps): ReactElement {
  const [isPending, setIsPending] = useState(deletionPending);
  const [deletionDate, setDeletionDate] = useState(scheduledDeletionDate);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const requestDeletion = useMutation({
    mutationFn: async () => {
      const data = await gql<{ requestAccountDeletion: DeletionResult }>(
        REQUEST_DELETION_MUTATION
      );
      return data.requestAccountDeletion;
    },
    onSuccess: async (result) => {
      setIsPending(result.isPending);
      setDeletionDate(result.scheduledDeletionDate);
      setMessage(result.message);
      setError(null);
      setShowConfirmDialog(false);
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });

      // Sign out user after requesting deletion
      if (result.success) {
        setTimeout(() => {
          logout();
        }, 2000);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setShowConfirmDialog(false);
    },
  });

  const cancelDeletion = useMutation({
    mutationFn: async () => {
      const data = await gql<{ cancelAccountDeletion: DeletionResult }>(
        CANCEL_DELETION_MUTATION
      );
      return data.cancelAccountDeletion;
    },
    onSuccess: (result) => {
      setIsPending(result.isPending);
      setDeletionDate(result.scheduledDeletionDate);
      setMessage(result.message);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="border border-destructive/50 rounded-lg p-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
      </div>

      {message && (
        <div className={`p-3 rounded mb-4 ${error ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-500'}`}>
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 rounded mb-4 bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {isPending && deletionDate ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <p className="text-yellow-600 dark:text-yellow-500 font-medium">
              Account deletion scheduled
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Your account and all data will be permanently deleted on{' '}
              <strong>{formatDate(deletionDate)}</strong>.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => cancelDeletion.mutate()}
            disabled={cancelDeletion.isPending}
          >
            {cancelDeletion.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Deletion Request'
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once you delete your account, all of your data including your family
            constellation, notes, events, and photos will be permanently deleted.
            This action is irreversible after the 14-day grace period.
          </p>

          <Button variant="destructive" onClick={() => setShowConfirmDialog(true)}>
            Delete Account
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowConfirmDialog(false)}
          />

          {/* Dialog */}
          <div className="relative z-50 w-full max-w-md bg-background border rounded-lg shadow-lg p-6 mx-4">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold mb-2">
              Are you sure you want to delete your account?
            </h2>

            <p className="text-sm text-muted-foreground mb-4">
              This will schedule your account for deletion. You have 14 days to change
              your mind and cancel the deletion. After 14 days, your account and all
              associated data will be permanently deleted.
            </p>

            <div className="text-sm text-muted-foreground mb-6">
              <strong>This includes:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your family constellation</li>
                <li>All people and relationships</li>
                <li>Notes, events, and photos</li>
                <li>Your account settings</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => requestDeletion.mutate()}
                disabled={requestDeletion.isPending}
              >
                {requestDeletion.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Yes, delete my account'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
