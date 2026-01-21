/**
 * Biography Generation Orchestrator
 *
 * Main entry point for the biography generation flow.
 * Orchestrates the multi-step process:
 * 1. Eligibility check - Verify source material exists
 * 2. Source assembly - Gather person details, notes, events
 * 3. Context mining - Find relatives and extract relevant facts
 * 4. Generation - Synthesize into biographical narrative
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check (caller responsibility)
 * - INV-AI002: AI Operations Must Track Usage (caller responsibility)
 * - INV-AI003: AI Suggestions Require User Approval (caller responsibility)
 * - INV-AI005: AI Outputs Use Zod Validation
 * - INV-AI007: Biography Requires Source Material
 * - INV-S002: Constellation Isolation
 */

// Re-export individual flow steps for direct use
export { checkBiographyEligibility } from './eligibility';
export { assembleSourceMaterial } from './source-assembly';
export { findRelatives, extractRelatedContext } from './context-mining';
export {
  generateBiographyFromSources,
  type GeneratedBiography,
} from './generation';

import { prisma } from '@/lib/prisma';
import { checkBiographyEligibility } from './eligibility';
import { assembleSourceMaterial } from './source-assembly';
import { findRelatives, extractRelatedContext } from './context-mining';
import { generateBiographyFromSources, type GeneratedBiography } from './generation';

/**
 * Options for biography generation.
 */
export interface GenerateBiographyOptions {
  /** Maximum word count for the biography */
  maxLength?: number;
  /** Skip context mining from relatives (faster but less rich) */
  skipContextMining?: boolean;
}

/**
 * Result of biography generation.
 * Extends GeneratedBiography with eligibility and source material info.
 */
export interface BiographyGenerationResult extends GeneratedBiography {
  /** ID of the person */
  personId: string;
  /** Whether context mining was performed */
  usedContextMining: boolean;
  /** Number of relatives whose context was used */
  relativesUsed: number;
}

/**
 * Generate a biography for a person using the full agentic flow.
 *
 * This is the main entry point for biography generation. It:
 * 1. Checks eligibility (INV-AI007)
 * 2. Assembles source material from the person's notes and events
 * 3. Mines context from relatives (optional)
 * 4. Generates the biographical narrative
 *
 * Note: Quota checking and usage tracking (INV-AI001, INV-AI002) must be
 * performed by the caller before invoking this function.
 *
 * @param personId - ID of the person to generate biography for
 * @param userId - ID of the requesting user (for access control)
 * @param options - Optional configuration
 * @returns Generated biography with metadata
 * @throws Error if person not eligible, not found, or access denied
 *
 * @invariant INV-AI005 - All outputs validated with Zod
 * @invariant INV-AI007 - Requires at least one note or event
 * @invariant INV-S002 - Only accesses data in user's constellation
 */
export async function generateBiography(
  personId: string,
  userId: string,
  options: GenerateBiographyOptions = {}
): Promise<BiographyGenerationResult> {
  const { maxLength = 500, skipContextMining = false } = options;

  console.log('[Biography Orchestrator] Starting for personId:', personId);

  // Step 1: Check eligibility (INV-AI007)
  const eligibility = await checkBiographyEligibility(personId, userId);

  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? 'Person not eligible for biography generation');
  }

  console.log('[Biography Orchestrator] Eligibility passed:', {
    noteCount: eligibility.noteCount,
    eventCount: eligibility.eventCount,
  });

  // Step 2: Assemble source material
  const sourceMaterial = await assembleSourceMaterial(personId, userId);

  console.log('[Biography Orchestrator] Source material assembled:', {
    notes: sourceMaterial.notes.length,
    events: sourceMaterial.events.length,
  });

  // Step 3: Mine context from relatives (optional)
  let relatedContext: Awaited<ReturnType<typeof extractRelatedContext>> = [];
  let relativesUsed = 0;

  if (!skipContextMining) {
    // Get constellation ID for finding relatives
    const person = await prisma.person.findFirst({
      where: { id: personId },
      select: { constellationId: true },
    });

    if (person?.constellationId) {
      const relatives = await findRelatives(personId, person.constellationId);
      console.log('[Biography Orchestrator] Found relatives:', relatives.length);

      if (relatives.length > 0) {
        relatedContext = await extractRelatedContext(
          sourceMaterial.personDetails,
          relatives
        );
        relativesUsed = relatedContext.length;
        console.log('[Biography Orchestrator] Extracted context from relatives:', relativesUsed);
      }
    }
  }

  // Step 4: Generate biography
  const generated = await generateBiographyFromSources(
    sourceMaterial,
    relatedContext,
    maxLength
  );

  console.log('[Biography Orchestrator] Generation complete:', {
    wordCount: generated.wordCount,
    confidence: generated.confidence,
    sourcesUsed: generated.sourcesUsed,
  });

  return {
    ...generated,
    personId,
    usedContextMining: !skipContextMining,
    relativesUsed,
  };
}
