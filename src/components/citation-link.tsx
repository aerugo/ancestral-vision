/**
 * CitationLink Component
 *
 * A clickable inline citation that opens the source content modal.
 */
'use client';

import * as React from 'react';
import type { ParsedCitation } from '@/types/citation';

interface CitationLinkProps {
  citation: ParsedCitation;
  onClick: (citation: ParsedCitation) => void;
}

/**
 * CitationLink - Renders an inline clickable citation as superscript [ref]
 *
 * Styled as a subtle superscript link that indicates it's interactive.
 * Hovering shows the source type and label in a tooltip.
 */
export function CitationLink({
  citation,
  onClick,
}: CitationLinkProps): React.ReactElement {
  return (
    <sup>
      <button
        type="button"
        onClick={() => onClick(citation)}
        className="text-[0.65em] text-primary/70 hover:text-primary hover:underline cursor-pointer transition-colors"
        title={`View ${citation.type.toLowerCase()}: ${citation.label}`}
      >
        [ref]
      </button>
    </sup>
  );
}
