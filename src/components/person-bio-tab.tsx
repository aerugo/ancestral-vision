'use client';

import * as React from 'react';
import { Loader2, Pencil, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUpdatePerson } from '@/hooks/use-people';
import { useApplyBiographySuggestion, useRejectBiographySuggestion } from '@/hooks/use-ai';
import { useBiographyStream } from '@/hooks/use-biography-stream';
import { biographyTransitionEvents } from '@/visualization/biography-transition-events';
import { segmentBiography } from '@/lib/citation-parser';
import { CitationLink } from '@/components/citation-link';
import { SourceContentModal } from '@/components/source-content-modal';
import type { ParsedCitation } from '@/types/citation';

interface PersonBioTabProps {
  personId: string;
  personName: string;
  biography: string | null | undefined;
}

type ViewState = 'view' | 'edit' | 'generating' | 'preview';

/**
 * PersonBioTab - Displays and allows inline editing of a person's biography
 *
 * Features:
 * - View mode: Shows biography text or "No biography available" placeholder
 * - Edit mode: Textarea for editing with Save/Cancel buttons
 * - Generate mode: AI-generated biography with loading animation
 * - Preview mode: Review generated biography before accepting
 * - Auto-saves on save button click
 * - Shows loading state while saving
 * - Triggers metamorphosis animation when adding new biography
 */
export function PersonBioTab({
  personId,
  personName,
  biography,
}: PersonBioTabProps): React.ReactElement {
  const [viewState, setViewState] = React.useState<ViewState>('view');
  const [editedBiography, setEditedBiography] = React.useState(biography || '');
  const [generatedBiography, setGeneratedBiography] = React.useState<string | null>(null);
  const [suggestionId, setSuggestionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [activeCitation, setActiveCitation] = React.useState<ParsedCitation | null>(null);

  // Sequential display state for relatives during context-mining
  // Relatives are accumulated in bioStream.seenRelatives (from context)
  const [displayIndex, setDisplayIndex] = React.useState(0);
  const [hasShownAllRelatives, setHasShownAllRelatives] = React.useState(false);
  // Display phase: 'source-stats' shows initial message for 5 seconds, then 'relatives'
  const [displayPhase, setDisplayPhase] = React.useState<'source-stats' | 'relatives'>('source-stats');

  const updatePerson = useUpdatePerson();
  const applyBiographySuggestion = useApplyBiographySuggestion();
  const rejectBiographySuggestion = useRejectBiographySuggestion();

  // Streaming biography generation with real-time progress
  // Generation persists in background when user navigates away
  const bioStream = useBiographyStream({
    personId,
    onComplete: (result) => {
      setGeneratedBiography(result.biography);
      setSuggestionId(result.suggestionId);
      setViewState('preview');
    },
    onError: (errorMsg) => {
      setError(
        errorMsg.includes('QUOTA_EXCEEDED')
          ? 'AI quota exceeded. Please try again later.'
          : errorMsg
      );
      setViewState('view');
    },
  });

  // Sync viewState with bioStream state when component mounts or personId changes
  // This ensures we show progress if generation was running in background
  React.useEffect(() => {
    if (bioStream.isGenerating) {
      setViewState('generating');
    } else if (bioStream.result && !generatedBiography) {
      // Generation completed while we were away - show preview
      setGeneratedBiography(bioStream.result.biography);
      setSuggestionId(bioStream.result.suggestionId);
      setViewState('preview');
    }
  }, [bioStream.isGenerating, bioStream.result, generatedBiography]);

  // Sync edited biography when prop changes (e.g., after successful save)
  React.useEffect(() => {
    if (viewState === 'view') {
      setEditedBiography(biography || '');
    }
  }, [biography, viewState]);

  // Reset display state when generation starts
  React.useEffect(() => {
    if (viewState === 'generating') {
      setDisplayIndex(0);
      setHasShownAllRelatives(false);
      setDisplayPhase('source-stats');
    }
  }, [viewState]);

  // Transition from source-stats to relatives phase after 5 seconds
  const sourceStats = bioStream.sourceStats;
  React.useEffect(() => {
    if (viewState !== 'generating' || displayPhase !== 'source-stats') return;
    // Only transition once we have source stats
    if (!sourceStats) return;

    const timer = setTimeout(() => {
      setDisplayPhase('relatives');
    }, 5000);

    return () => clearTimeout(timer);
  }, [viewState, displayPhase, sourceStats]);

  // Cycle through displayed relatives every 8 seconds
  // Uses seenRelatives from bioStream (accumulated in context, not affected by React batching)
  // Only starts cycling once we've transitioned to 'relatives' phase
  const seenRelatives = bioStream.seenRelatives;
  React.useEffect(() => {
    if (viewState !== 'generating' || displayPhase !== 'relatives' || seenRelatives.length === 0) return;

    const interval = setInterval(() => {
      setDisplayIndex((prev) => {
        if (prev < seenRelatives.length - 1) {
          return prev + 1;
        }
        // We've finished showing all relatives in the queue
        setHasShownAllRelatives(true);
        return prev;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [viewState, displayPhase, seenRelatives.length]);

  const handleEdit = () => {
    setEditedBiography(biography || '');
    setViewState('edit');
    setError(null);
  };

  const handleCancel = () => {
    setEditedBiography(biography || '');
    setGeneratedBiography(null);
    setSuggestionId(null);
    setViewState('view');
    setError(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      const trimmedBio = editedBiography.trim();
      const hadNoBiography = !biography || biography.trim() === '';
      const isAddingBiography = hadNoBiography && trimmedBio !== '';

      // If adding a biography (not editing), trigger the metamorphosis animation BEFORE
      // the mutation so it can capture the ghost node position before the scene rebuilds
      if (isAddingBiography) {
        biographyTransitionEvents.emit(personId);
      }

      await updatePerson.mutateAsync({
        id: personId,
        input: {
          // Use null to clear biography, otherwise send the trimmed value
          biography: trimmedBio === '' ? null : trimmedBio,
        },
      });

      setViewState('view');
    } catch {
      setError('Failed to save biography');
    }
  };

  const handleGenerate = () => {
    setError(null);
    setViewState('generating');
    bioStream.startGeneration(500);
  };

  const handleCancelGeneration = () => {
    bioStream.cancelGeneration();
    bioStream.clearState();
    setViewState('view');
  };

  const handleAcceptGenerated = async () => {
    if (!suggestionId || !generatedBiography) return;

    try {
      setError(null);
      const hadNoBiography = !biography || biography.trim() === '';

      // Trigger the metamorphosis animation BEFORE applying the suggestion
      if (hadNoBiography) {
        biographyTransitionEvents.emit(personId);
      }

      await applyBiographySuggestion.mutateAsync({
        suggestionId,
        personId,
      });

      setGeneratedBiography(null);
      setSuggestionId(null);
      bioStream.clearState();
      setViewState('view');
    } catch {
      setError('Failed to apply biography');
    }
  };

  const handleRejectGenerated = async () => {
    // Mark suggestion as rejected in DB (if we have a suggestionId)
    if (suggestionId) {
      try {
        await rejectBiographySuggestion.mutateAsync({ suggestionId });
      } catch {
        // Ignore errors - we still want to clear local state
        console.error('[PersonBioTab] Failed to reject suggestion in DB');
      }
    }
    setGeneratedBiography(null);
    setSuggestionId(null);
    bioStream.clearState();
    setViewState('view');
    setError(null);
  };

  // Generating mode - show loading animation with real-time progress
  if (viewState === 'generating') {
    const progress = bioStream.progress;

    // Check if we're in source-stats phase (showing initial message)
    const showSourceStats = displayPhase === 'source-stats' && sourceStats;

    // Determine what to display for relatives phase
    // Keep showing relatives until all have been displayed, even if backend moved to generation step
    const currentRelative = seenRelatives[displayIndex];
    const hasRelativesToShow = displayPhase === 'relatives' && seenRelatives.length > 0 && !hasShownAllRelatives;
    const showRelativeMessage = hasRelativesToShow && currentRelative;
    const showCombiningMessage = displayPhase === 'relatives' && !hasRelativesToShow && progress?.step === 'context-mining';

    // Calculate display progress
    let displayProgress = progress?.progress ?? 0;
    if (showSourceStats) {
      // During source-stats phase, show 10-15% progress
      displayProgress = 12;
    } else if (hasRelativesToShow && currentRelative) {
      // Base progress: 20% at start, each relative adds progress up to 80%
      const relativeProgress = (displayIndex + 1) / currentRelative.total;
      displayProgress = 20 + relativeProgress * 60; // 20% to 80%
    } else if (displayPhase === 'relatives' && !hasShownAllRelatives && seenRelatives.length === 0) {
      // No relatives yet but in relatives phase, use server progress
      displayProgress = progress?.progress ?? 0;
    } else if (progress?.step === 'context-mining') {
      // All relatives displayed but still in context-mining step
      displayProgress = 80;
    }
    // Otherwise use actual server progress (for generation step after relatives shown)

    // Determine the step message
    let stepMessage = progress?.message ?? 'Starting generation...';
    if (showSourceStats) {
      stepMessage = 'Gathering sources...';
    } else if (showRelativeMessage || showCombiningMessage) {
      stepMessage = 'Mining context from relatives...';
    }

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Sparkles className="h-12 w-12 text-primary animate-pulse" />

        {/* Progress bar */}
        <Progress value={displayProgress} className="w-48" />

        {/* Current step message */}
        <p className="text-sm text-muted-foreground text-center">
          {stepMessage}
        </p>

        {/* Source stats message - shown for 5 seconds at start */}
        {showSourceStats && (
          <p className="text-xs text-muted-foreground text-center">
            Combining {sourceStats.eventCount} events and {sourceStats.noteCount} notes
            about the life of <span className="font-medium">{personName}</span>
          </p>
        )}

        {/* Sequential relative display - show while cycling through relatives or combining */}
        {(showRelativeMessage || showCombiningMessage) && (
          <p className="text-xs text-muted-foreground text-center">
            {showCombiningMessage ? (
              'Combining contexts...'
            ) : currentRelative ? (
              <>
                Processing {currentRelative.relationship}:{' '}
                <span className="font-medium">{currentRelative.name}</span>
                {' '}({currentRelative.index}/{currentRelative.total})
              </>
            ) : null}
          </p>
        )}

        {/* Cancel button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancelGeneration}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Preview mode - show generated biography with accept/reject options
  if (viewState === 'preview' && generatedBiography) {
    const isPending = applyBiographySuggestion.isPending;

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI-Generated Biography</span>
          </div>
        </div>

        <div className="flex-1 rounded-md border border-primary/30 bg-primary/5 p-3 mb-3">
          <BiographyText
            text={generatedBiography}
            onCitationClick={(citation) => setActiveCitation(citation)}
          />
        </div>

        {/* Source content modal for preview */}
        {activeCitation && (
          <SourceContentModal
            type={activeCitation.type}
            id={activeCitation.id}
            onClose={() => setActiveCitation(null)}
          />
        )}

        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectGenerated}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleAcceptGenerated}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Use This Biography
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode
  if (viewState === 'edit') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Edit Biography</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={updatePerson.isPending}
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={updatePerson.isPending}
              aria-label="Save biography"
            >
              {updatePerson.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <textarea
          value={editedBiography}
          onChange={(e) => setEditedBiography(e.target.value)}
          className="flex-1 min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          placeholder="Write a biography for this person..."
          disabled={updatePerson.isPending}
          autoFocus
        />

        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={updatePerson.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updatePerson.isPending}
          >
            {updatePerson.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Handler for citation clicks
  const handleCitationClick = (citation: ParsedCitation) => {
    setActiveCitation(citation);
  };

  // View mode
  return (
    <div className="prose prose-sm prose-invert max-w-none">
      {biography ? (
        <>
          <BiographyText
            text={biography}
            onCitationClick={handleCitationClick}
          />
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Biography
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate with AI
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground italic mb-4">
            No biography available.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Write Biography
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-4 text-center">{error}</p>
      )}

      {/* Source content modal */}
      {activeCitation && (
        <SourceContentModal
          type={activeCitation.type}
          id={activeCitation.id}
          onClose={() => setActiveCitation(null)}
        />
      )}
    </div>
  );
}

/**
 * BiographyText - Renders biography with clickable citations
 */
function BiographyText({
  text,
  onCitationClick,
}: {
  text: string;
  onCitationClick: (citation: ParsedCitation) => void;
}): React.ReactElement {
  const segments = React.useMemo(() => segmentBiography(text), [text]);

  return (
    <p className="text-sm text-foreground whitespace-pre-wrap mb-4">
      {segments.map((segment, index) => {
        if (segment.type === 'citation' && segment.citation) {
          return (
            <CitationLink
              key={index}
              citation={segment.citation}
              onClick={onCitationClick}
            />
          );
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </p>
  );
}
