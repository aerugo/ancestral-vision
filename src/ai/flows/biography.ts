/**
 * Biography Generation Flow
 *
 * Genkit flow for generating biographical narratives from person data.
 * Uses AI to create engaging, factual biographies while respecting
 * data limitations.
 *
 * Invariants:
 * - INV-AI005: AI Outputs Use Zod Validation - All AI outputs validated with Zod schemas
 */
import { getAI, getDefaultModel } from '../genkit';
import {
  BiographyInputSchema,
  BiographyOutputSchema,
  type BiographyInput,
  type BiographyOutput,
} from '../schemas/biography';

/** Default maximum word count for biographies */
const DEFAULT_MAX_LENGTH = 300;

/**
 * Format a FuzzyDate for display in the prompt
 */
function formatFuzzyDate(
  date: BiographyInput['birthDate'],
  prefix: string = ''
): string {
  if (!date || !date.year) return '';

  const parts: string[] = [];

  if (date.type === 'approximate') {
    parts.push('around');
  } else if (date.type === 'before') {
    parts.push('before');
  } else if (date.type === 'after') {
    parts.push('after');
  }

  // Format the date
  if (date.month && date.day) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    parts.push(`${monthNames[date.month - 1]} ${date.day}, ${date.year}`);
  } else if (date.month) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    parts.push(`${monthNames[date.month - 1]} ${date.year}`);
  } else {
    parts.push(String(date.year));
  }

  return prefix + parts.join(' ');
}

/**
 * Build a prompt for biography generation from the input data
 */
export function buildBiographyPrompt(input: BiographyInput): string {
  const lines: string[] = [];

  lines.push('Generate a biographical narrative for the following person.');
  lines.push('Write in a warm, respectful tone suitable for a family history context.');
  lines.push(`Maximum length: ${input.maxLength ?? DEFAULT_MAX_LENGTH} words.`);
  lines.push('');
  lines.push('Person Information:');
  lines.push(`- Name: ${input.displayName}`);

  if (input.gender) {
    lines.push(`- Gender: ${input.gender.toLowerCase()}`);
  }

  const birthDateStr = formatFuzzyDate(input.birthDate, 'Born ');
  if (birthDateStr) {
    lines.push(`- ${birthDateStr}`);
  }

  if (input.birthPlace?.name) {
    lines.push(`- Birth place: ${input.birthPlace.name}`);
  }

  const deathDateStr = formatFuzzyDate(input.deathDate, 'Died ');
  if (deathDateStr) {
    lines.push(`- ${deathDateStr}`);
  }

  if (input.deathPlace?.name) {
    lines.push(`- Death place: ${input.deathPlace.name}`);
  }

  if (input.occupation) {
    lines.push(`- Occupation: ${input.occupation}`);
  }

  lines.push('');
  lines.push('Instructions:');
  lines.push('- Only include facts provided above');
  lines.push('- Do not invent or assume details not provided');
  lines.push('- If minimal information is available, keep the biography brief');
  lines.push('- Use appropriate language for uncertain dates (e.g., "around 1850")');

  return lines.join('\n');
}

/**
 * Determine which data sources were used in the biography
 */
function determineSources(input: BiographyInput): string[] {
  const sources: string[] = [];

  if (input.birthDate?.year) sources.push('birthDate');
  if (input.deathDate?.year) sources.push('deathDate');
  if (input.birthPlace?.name) sources.push('birthPlace');
  if (input.deathPlace?.name) sources.push('deathPlace');
  if (input.occupation) sources.push('occupation');
  if (input.gender) sources.push('gender');

  return sources;
}

/**
 * Calculate confidence based on available data
 */
function calculateConfidence(input: BiographyInput): number {
  let score = 0.3; // Base confidence for name alone

  if (input.birthDate?.year) score += 0.15;
  if (input.deathDate?.year) score += 0.1;
  if (input.birthPlace?.name) score += 0.1;
  if (input.deathPlace?.name) score += 0.05;
  if (input.occupation) score += 0.15;
  if (input.gender) score += 0.05;

  // Date precision bonus
  if (input.birthDate?.month) score += 0.05;
  if (input.birthDate?.day) score += 0.05;

  return Math.min(score, 1.0);
}

/**
 * Generate a biography for a person
 *
 * @param input - Person data for biography generation
 * @returns Generated biography with metadata
 */
export async function generateBiography(
  input: BiographyInput
): Promise<BiographyOutput> {
  // Validate input
  const validatedInput = BiographyInputSchema.parse(input);

  const ai = getAI();
  const model = getDefaultModel();
  const prompt = buildBiographyPrompt(validatedInput);

  // Generate biography using Genkit
  const response = await ai.generate({
    model,
    prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: (validatedInput.maxLength ?? DEFAULT_MAX_LENGTH) * 2,
    },
  });

  const biography = response.text.trim();
  const wordCount = biography.split(/\s+/).length;
  const sourcesUsed = determineSources(validatedInput);
  const confidence = calculateConfidence(validatedInput);

  const output: BiographyOutput = {
    biography,
    wordCount,
    confidence,
    sourcesUsed,
  };

  // Validate output before returning
  return BiographyOutputSchema.parse(output);
}
