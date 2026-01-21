/**
 * Biography Eligibility Check
 *
 * Verifies a person has sufficient source material for biography generation.
 * A person is eligible if they have at least one note OR one event.
 *
 * Invariants:
 * - INV-AI007: Biography Requires Source Material
 * - INV-S002: Constellation Isolation
 */
import { prisma } from '@/lib/prisma';
import type { EligibilityResult } from '@/ai/schemas/biography';

/**
 * Check if a person is eligible for biography generation.
 *
 * A person is eligible if they have at least one note OR one event.
 * Persons with only basic details (name, dates) are not eligible
 * to prevent AI from generating speculative content.
 *
 * @param personId - ID of the person to check
 * @param userId - ID of the requesting user (for constellation access check)
 * @returns Eligibility result with counts and guidance if ineligible
 * @throws Error if person not found or user doesn't have access
 *
 * @invariant INV-AI007 - Biography Requires Source Material
 * @invariant INV-S002 - Constellation Isolation
 */
export async function checkBiographyEligibility(
  personId: string,
  userId: string
): Promise<EligibilityResult> {
  // Verify person exists and user has access (INV-S002)
  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      constellation: {
        ownerId: userId,
      },
      deletedAt: null,
    },
  });

  if (!person) {
    throw new Error('Person not found or access denied');
  }

  // Count notes and events in parallel
  const [noteCount, eventCount] = await Promise.all([
    prisma.note.count({
      where: {
        personId,
        deletedAt: null,
      },
    }),
    prisma.event.count({
      where: {
        OR: [
          { primaryPersonId: personId },
          { participants: { some: { personId } } },
        ],
        deletedAt: null,
      },
    }),
  ]);

  // Check eligibility (INV-AI007)
  const eligible = noteCount > 0 || eventCount > 0;

  if (eligible) {
    return {
      eligible: true,
      personId,
      noteCount,
      eventCount,
    };
  }

  // Return helpful guidance for ineligible persons
  return {
    eligible: false,
    personId,
    noteCount: 0,
    eventCount: 0,
    reason:
      'Biography generation requires at least one note or event. ' +
      'Add some information about this person to generate a biography.',
    guidance:
      `Add notes about ${person.displayName}'s life, memories, or stories. ` +
      `You can also add events like births, marriages, or achievements. ` +
      `These will be used to create an accurate, factual biography.`,
  };
}
