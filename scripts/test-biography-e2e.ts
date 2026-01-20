/**
 * End-to-End Biography Generation Test
 *
 * Tests the biography generation flow using data from example-genealogy.json.
 * Outputs results to data/generated_bio.md.
 *
 * Usage: npx tsx scripts/test-biography-e2e.ts
 *
 * Requires: GOOGLE_AI_API_KEY environment variable
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as path from 'path';
import { getAI, getModel, getRetryMiddleware } from '../src/ai/genkit';
import type {
  PersonDetails,
  NoteSource,
  EventSource,
  RelativeInfo,
  RelatedContext,
} from '../src/ai/schemas/biography-v2';
// Import production extractRelatedContext for true E2E testing
import { extractRelatedContext } from '../src/ai/flows/biography/context-mining';

// Types for the JSON data
interface JsonPerson {
  id: string;
  given_name: string;
  surname: string;
  name: string;
  maiden_name?: string;
  gender: string;
  birth_date?: string;
  birth_place?: string;
  death_date?: string;
  death_place?: string;
  biography?: string;
  status?: string;
}

interface JsonEvent {
  id: string;
  event_type: string;
  primary_person_id: string;
  event_date?: string;
  event_year?: number;
  location?: string;
  description?: string;
}

interface JsonNote {
  id: string;
  person_id: string;
  content: string;
  category?: string;
  source?: string;
}

interface JsonSpouseLink {
  person1_id: string;
  person2_id: string;
}

interface JsonParentChildLink {
  parent_id: string;
  child_id: string;
}

interface GenealogyData {
  persons: JsonPerson[];
  events: JsonEvent[];
  notes: JsonNote[];
  spouse_links: JsonSpouseLink[];
  child_links: JsonParentChildLink[];
}

// Target person: Sarah Elizabeth Martin
const TARGET_PERSON_ID = '5e46215b-cd77-483c-afee-e3ce86e48509';

// Check for dry-run mode
const DRY_RUN = process.argv.includes('--dry-run') || !process.env.GOOGLE_AI_API_KEY;

async function main() {
  console.log('=== Biography Generation E2E Test ===\n');

  // Check for API key
  if (!process.env.GOOGLE_AI_API_KEY) {
    if (process.argv.includes('--dry-run')) {
      console.log('Running in DRY-RUN mode (no AI calls)\n');
    } else {
      console.log('⚠️  GOOGLE_AI_API_KEY not found. Running in DRY-RUN mode.');
      console.log('   To run with AI, add GOOGLE_AI_API_KEY to .env.local\n');
    }
  }

  // Load genealogy data
  const dataPath = path.join(__dirname, '../data/example-genealogy.json');
  console.log(`Loading data from ${dataPath}...`);
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data: GenealogyData = JSON.parse(rawData);
  console.log(
    `Loaded ${data.persons.length} persons, ${data.events.length} events, ${data.notes.length} notes\n`
  );

  // Find target person
  const targetPerson = data.persons.find((p) => p.id === TARGET_PERSON_ID);
  if (!targetPerson) {
    console.error(`Target person ${TARGET_PERSON_ID} not found`);
    process.exit(1);
  }
  console.log(`Target: ${targetPerson.name}`);
  console.log(`Birth: ${targetPerson.birth_date} at ${targetPerson.birth_place}`);
  console.log(`Death: ${targetPerson.death_date} at ${targetPerson.death_place}\n`);

  // Build PersonDetails
  const personDetails: PersonDetails = {
    personId: targetPerson.id,
    givenName: targetPerson.given_name,
    surname: targetPerson.surname,
    displayName: targetPerson.name,
    gender: targetPerson.gender.toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER',
    birthDate: targetPerson.birth_date ? parseFuzzyDate(targetPerson.birth_date) : undefined,
    deathDate: targetPerson.death_date ? parseFuzzyDate(targetPerson.death_date) : undefined,
    birthPlace: targetPerson.birth_place ? { name: targetPerson.birth_place } : undefined,
    deathPlace: targetPerson.death_place ? { name: targetPerson.death_place } : undefined,
    biography: targetPerson.biography,
  };

  // Get notes for target
  const targetNotes = data.notes.filter((n) => n.person_id === TARGET_PERSON_ID);
  console.log(`Found ${targetNotes.length} notes for ${targetPerson.name}`);

  // Get events for target
  const targetEvents = data.events.filter((e) => e.primary_person_id === TARGET_PERSON_ID);
  console.log(`Found ${targetEvents.length} events for ${targetPerson.name}\n`);

  // Build NoteSource array
  const notes: NoteSource[] = targetNotes.map((n) => ({
    noteId: n.id,
    title: n.category,
    content: n.content,
    createdAt: new Date().toISOString(),
  }));

  // Build EventSource array
  const events: EventSource[] = targetEvents.map((e) => ({
    eventId: e.id,
    title: e.event_type,
    description: e.description,
    date: e.event_date
      ? parseFuzzyDate(e.event_date)
      : e.event_year
        ? { type: 'exact' as const, year: e.event_year }
        : undefined,
    location: e.location ? { name: e.location } : undefined,
  }));

  // Find relatives
  console.log('=== Finding Relatives ===\n');
  const relatives = findRelatives(data, TARGET_PERSON_ID);
  console.log(`Found ${relatives.length} relatives:`);
  for (const rel of relatives) {
    console.log(`  - ${rel.relationshipType}: ${rel.personName}`);
  }
  console.log();

  // Extract related context using AI
  console.log('=== Extracting Related Context (AI) ===\n');
  let relatedContext: RelatedContext[];
  if (DRY_RUN) {
    console.log('  [DRY-RUN] Skipping AI context extraction');
    relatedContext = [];
  } else {
    relatedContext = await extractRelatedContext(personDetails, relatives);
    console.log(`Extracted context from ${relatedContext.length} relatives\n`);
  }

  // Generate biography using AI
  console.log('=== Generating Biography (AI) ===\n');
  let biography: string;
  if (DRY_RUN) {
    console.log('  [DRY-RUN] Skipping AI biography generation');
    biography = '[DRY-RUN: Biography would be generated here using the source material below]';
  } else {
    biography = await generateBiography(personDetails, notes, events, relatedContext);
  }

  // Write output
  const outputPath = path.join(__dirname, '../data/generated_bio.md');
  const markdown = formatBiographyMarkdown(personDetails, notes, events, relatedContext, biography);
  fs.writeFileSync(outputPath, markdown);
  console.log(`\nBiography written to ${outputPath}`);
}

function parseFuzzyDate(dateStr: string): { type: 'exact'; year: number; month?: number; day?: number } {
  const parts = dateStr.split('-');
  return {
    type: 'exact',
    year: parseInt(parts[0]!, 10),
    month: parts[1] ? parseInt(parts[1], 10) : undefined,
    day: parts[2] ? parseInt(parts[2], 10) : undefined,
  };
}

function findRelatives(data: GenealogyData, personId: string): RelativeInfo[] {
  const relatives: RelativeInfo[] = [];
  const seenIds = new Set<string>();

  const addRelative = (type: RelativeInfo['relationshipType'], person: JsonPerson) => {
    if (seenIds.has(person.id)) return;
    seenIds.add(person.id);

    const personNotes = data.notes.filter((n) => n.person_id === person.id);
    const personEvents = data.events.filter((e) => e.primary_person_id === person.id);

    relatives.push({
      relationshipType: type,
      personId: person.id,
      personName: person.name,
      biography: person.biography,
      notes: personNotes.map((n) => ({
        noteId: n.id,
        title: n.category,
        content: n.content,
        createdAt: new Date().toISOString(),
      })),
      events: personEvents.map((e) => ({
        eventId: e.id,
        title: e.event_type,
        description: e.description,
        date: e.event_date
          ? parseFuzzyDate(e.event_date)
          : e.event_year
            ? { type: 'exact' as const, year: e.event_year }
            : undefined,
        location: e.location ? { name: e.location } : undefined,
      })),
    });
  };

  // Find parents
  for (const link of data.child_links || []) {
    if (link.child_id === personId) {
      const parent = data.persons.find((p) => p.id === link.parent_id);
      if (parent) addRelative('parent', parent);
    }
  }

  // Find children
  for (const link of data.child_links || []) {
    if (link.parent_id === personId) {
      const child = data.persons.find((p) => p.id === link.child_id);
      if (child) addRelative('child', child);
    }
  }

  // Find spouses
  for (const link of data.spouse_links || []) {
    if (link.person1_id === personId) {
      const spouse = data.persons.find((p) => p.id === link.person2_id);
      if (spouse) addRelative('spouse', spouse);
    }
    if (link.person2_id === personId) {
      const spouse = data.persons.find((p) => p.id === link.person1_id);
      if (spouse) addRelative('spouse', spouse);
    }
  }

  // Find siblings (share a parent)
  const parentIds: string[] = [];
  for (const link of data.child_links || []) {
    if (link.child_id === personId) {
      parentIds.push(link.parent_id);
    }
  }
  for (const link of data.child_links || []) {
    if (parentIds.includes(link.parent_id) && link.child_id !== personId) {
      const sibling = data.persons.find((p) => p.id === link.child_id);
      if (sibling) addRelative('sibling', sibling);
    }
  }

  return relatives;
}

async function generateBiography(
  personDetails: PersonDetails,
  notes: NoteSource[],
  events: EventSource[],
  relatedContext: RelatedContext[]
): Promise<string> {
  const ai = getAI();
  const model = getModel('quality'); // Use Pro for high-quality biography output
  const retryMiddleware = getRetryMiddleware();

  // Build context section from related people
  const relatedContextSection = relatedContext
    .map((ctx) => {
      const facts = ctx.relevantFacts.map((f) => `- ${f.fact} (from ${f.source})`).join('\n');
      return `From ${ctx.relationshipType} ${ctx.personName}:\n${facts}`;
    })
    .join('\n\n');

  // Build notes section
  const notesSection = notes
    .slice(0, 10)
    .map((n) => `- ${n.content}`)
    .join('\n');

  // Build events section
  const eventsSection = events
    .slice(0, 10)
    .map((e) => `- ${e.title}: ${e.description ?? 'No description'}`)
    .join('\n');

  const prompt = `
Generate a biographical narrative for the following person based ONLY on the provided source material.

PERSON: ${personDetails.displayName}
Gender: ${personDetails.gender}
Birth: ${formatDate(personDetails.birthDate)} at ${personDetails.birthPlace?.name ?? 'Unknown'}
Death: ${formatDate(personDetails.deathDate)} at ${personDetails.deathPlace?.name ?? 'Unknown'}

NOTES ABOUT THIS PERSON:
${notesSection}

EVENTS IN THIS PERSON'S LIFE:
${eventsSection}

CONTEXT FROM RELATIVES:
${relatedContextSection}

INSTRUCTIONS:
1. Write a warm, engaging biographical narrative (300-500 words)
2. Only include facts that are directly supported by the source material above
3. Include citations in brackets like [Note: content] or [Event: title] or [From parent: fact]
4. Do NOT invent or speculate about details not in the sources
5. Focus on the person's life story, relationships, and experiences
6. Write in third person, past tense

Generate the biography:
`.trim();

  console.log('Generating biography with citations...');

  const response = await ai.generate({
    model,
    prompt,
    config: { temperature: 0.7, maxOutputTokens: 10000 },
    use: [retryMiddleware],
  });

  const text = response.text.trim();
  if (!text) {
    console.log('  Warning: Empty response from AI');
    console.log('  Response object:', JSON.stringify(response, null, 2).substring(0, 500));
  }

  return text;
}

function formatDate(
  date?: { type: string; year: number; month?: number; day?: number }
): string {
  if (!date) return 'Unknown';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  if (date.month && date.day) {
    return `${months[date.month - 1]} ${date.day}, ${date.year}`;
  } else if (date.month) {
    return `${months[date.month - 1]} ${date.year}`;
  }
  return String(date.year);
}

function formatBiographyMarkdown(
  personDetails: PersonDetails,
  notes: NoteSource[],
  events: EventSource[],
  relatedContext: RelatedContext[],
  biography: string
): string {
  const lines: string[] = [];

  lines.push(`# ${personDetails.displayName}`);
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Biography');
  lines.push('');
  lines.push(biography);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Source Material');
  lines.push('');
  lines.push('### Notes');
  lines.push('');
  for (const note of notes.slice(0, 10)) {
    lines.push(`- ${note.content}`);
  }
  lines.push('');
  lines.push('### Events');
  lines.push('');
  for (const event of events.slice(0, 10)) {
    lines.push(`- **${event.title}**: ${event.description ?? 'No description'}`);
  }
  lines.push('');
  lines.push('### Related Context');
  lines.push('');
  for (const ctx of relatedContext) {
    lines.push(`#### From ${ctx.relationshipType}: ${ctx.personName}`);
    lines.push('');
    for (const fact of ctx.relevantFacts) {
      lines.push(`- ${fact.fact}`);
      lines.push(`  - *Source*: ${fact.source}${fact.sourceId ? ` (${fact.sourceId})` : ''}`);
      lines.push(`  - *Relevance*: ${fact.relevanceReason}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Run the test
main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
