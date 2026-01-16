#!/usr/bin/env node
/**
 * Genealogy Cleanup Script
 * Merges duplicate entries and removes orphaned persons
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'example-genealogy.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== Genealogy Cleanup Script ===\n');
console.log(`Initial state:`);
console.log(`  Persons: ${data.persons.length}`);
console.log(`  Child links: ${data.child_links.length}`);
console.log(`  Spouse links: ${data.spouse_links.length}`);
console.log(`  Events: ${data.events.length}`);
console.log(`  Notes: ${data.notes.length}`);

// Define merges: [keep_id, ...remove_ids]
const merges = [
  // Arthur Maxwell - keep complete, remove pending
  ['3ca31370-5c1e-45ff-89ee-4ca13d9c445b', '4df4c0b1-1424-4354-b619-bfc23b65bb28'],
  // Clara Maxwell - keep complete, remove pending
  ['8ef316c2-9d6c-46bc-91f9-9e917b49f0c7', '7ead33bb-e13f-43b2-bb27-332224b1bbfe'],
  // Thomas Harrison - keep complete, remove pending
  ['3a7d6912-b1db-48d2-89ef-8d51d507466d', '6e451b17-0895-4912-bbdb-31a39a0b1a60'],
  // Eleanor Harrison - keep complete, remove 2 pending
  ['b4c94c9e-40f9-4fef-aee0-37e5a8b222d8', '2d5cb9aa-4f47-4e23-b04a-87a90617d797', '68f1d7e7-829d-4e3a-ba53-c13d4fb61df1'],
  // Robert Martin - both incomplete, keep first
  ['fffccfe6-7157-48e4-8acc-c8ca84efa823', '8057df6e-6a14-4c80-b713-c87ef786b86d'],
  // Clara Martin - both incomplete, keep first
  ['4f65b6e6-393a-4d22-8adf-9e9dd99ceca5', '752db909-530c-48d4-a8e9-7d10ebfbec92'],
  // Sarah Harrison - both incomplete, keep first
  ['19fbed2b-acfe-4268-8ab5-c4cd4a2a73a8', '213b92f7-dc64-409c-b352-1e5d3b77a88f'],
  // Arthur Martin - both 1876, keep first
  ['1885c1a0-416c-4b97-8f2d-abbfe53c2e4e', '1eb39771-1465-4d56-8315-35ee4ee8d41d'],
  // William Harrison - keep complete, remove pending
  ['473c7957-098c-4576-9f5f-0486715a4c28', 'be05708c-d005-46f6-abeb-ff1498753ae3'],
  // Samuel Martin - keep complete (0b00dfb7), remove pending ones
  ['0b00dfb7-018a-48c7-ab2a-48dbfb0cf9db', '945ab7af-15e6-4840-81c0-cd3fa79341b7', 'aeef84c4-fe6c-478f-ae6d-d01b85eb29cf'],
  // John Martin gen -1 - keep complete (b82c03f1), remove queued duplicate
  ['b82c03f1-0542-4cea-8e85-6a080877392f', '02837231-6067-4d3e-903d-db6e3f616144'],
  // Eleanor Thompson 1798 - keep complete, remove pending duplicate
  ['60a4452d-5291-432f-be81-2797f2eee9a8', '9adfa173-156d-47dc-9169-f81bcd1ff2b7'],
];

console.log(`\n--- Merging ${merges.length} duplicate groups ---`);

// Build replacement map
const replaceMap = new Map();
for (const [keepId, ...removeIds] of merges) {
  for (const removeId of removeIds) {
    replaceMap.set(removeId, keepId);
  }
}

// Function to replace ID if it's in the map
function replaceId(id) {
  return replaceMap.get(id) || id;
}

// Update child_links
data.child_links = data.child_links.map(link => ({
  parent_id: replaceId(link.parent_id),
  child_id: replaceId(link.child_id)
}));

// Remove duplicate links that might have been created
const childLinkSet = new Set();
data.child_links = data.child_links.filter(link => {
  const key = `${link.parent_id}-${link.child_id}`;
  if (childLinkSet.has(key)) return false;
  childLinkSet.add(key);
  return true;
});

// Update spouse_links
data.spouse_links = data.spouse_links.map(link => ({
  person1_id: replaceId(link.person1_id),
  person2_id: replaceId(link.person2_id)
}));

// Remove duplicate spouse links
const spouseLinkSet = new Set();
data.spouse_links = data.spouse_links.filter(link => {
  const key = [link.person1_id, link.person2_id].sort().join('-');
  if (spouseLinkSet.has(key)) return false;
  spouseLinkSet.add(key);
  return true;
});

// Update events
data.events = data.events.map(event => ({
  ...event,
  primary_person_id: replaceId(event.primary_person_id)
}));

// Update notes
data.notes = data.notes.map(note => ({
  ...note,
  person_id: replaceId(note.person_id)
}));

// Remove merged persons
const removeIds = new Set(replaceMap.keys());
const removedCount = data.persons.filter(p => removeIds.has(p.id)).length;
data.persons = data.persons.filter(p => !removeIds.has(p.id));

console.log(`  Removed ${removedCount} duplicate person entries`);

// Now handle orphans - find persons not connected to any links
console.log(`\n--- Finding orphaned persons ---`);

const connectedIds = new Set();
for (const link of data.child_links) {
  connectedIds.add(link.parent_id);
  connectedIds.add(link.child_id);
}
for (const link of data.spouse_links) {
  connectedIds.add(link.person1_id);
  connectedIds.add(link.person2_id);
}

const orphans = data.persons.filter(p => !connectedIds.has(p.id));
console.log(`  Found ${orphans.length} orphaned persons`);

// For demo purposes, we'll remove orphans that have no biography
// Keep orphans that have complete biographies (they might be important)
const orphansToRemove = orphans.filter(p => !p.biography || p.biography.length < 100);
const orphanIdsToRemove = new Set(orphansToRemove.map(p => p.id));

console.log(`  Removing ${orphansToRemove.length} orphans without biographies`);
console.log(`  Keeping ${orphans.length - orphansToRemove.length} orphans with biographies`);

// Remove orphans
data.persons = data.persons.filter(p => !orphanIdsToRemove.has(p.id));

// Clean up events and notes referencing removed persons
const remainingPersonIds = new Set(data.persons.map(p => p.id));
const removedEventCount = data.events.filter(e => !remainingPersonIds.has(e.primary_person_id)).length;
const removedNoteCount = data.notes.filter(n => !remainingPersonIds.has(n.person_id)).length;

data.events = data.events.filter(e => remainingPersonIds.has(e.primary_person_id));
data.notes = data.notes.filter(n => remainingPersonIds.has(n.person_id));

console.log(`  Removed ${removedEventCount} orphaned events`);
console.log(`  Removed ${removedNoteCount} orphaned notes`);

// Fix broken name "William ."
const brokenName = data.persons.find(p => p.surname === '.');
if (brokenName) {
  console.log(`\n--- Fixing broken name: "${brokenName.name}" ---`);
  // This person is likely William Thompson based on context
  brokenName.surname = 'Thompson';
  brokenName.name = 'William Thompson';
  console.log(`  Fixed to: "${brokenName.name}"`);
}

// Ensure all remaining persons have status "complete" or are clearly identified
// For persons with biographies, set status to complete
data.persons = data.persons.map(p => {
  if (p.biography && p.biography.length > 100) {
    return { ...p, status: 'complete' };
  }
  return p;
});

console.log(`\n=== Final state ===`);
console.log(`  Persons: ${data.persons.length}`);
console.log(`  Child links: ${data.child_links.length}`);
console.log(`  Spouse links: ${data.spouse_links.length}`);
console.log(`  Events: ${data.events.length}`);
console.log(`  Notes: ${data.notes.length}`);

// Validation
console.log(`\n=== Validation ===`);

// Check for 3+ parents
const parentCounts = {};
for (const link of data.child_links) {
  parentCounts[link.child_id] = (parentCounts[link.child_id] || 0) + 1;
}
const threeParentKids = Object.entries(parentCounts).filter(([_, count]) => count > 2);
console.log(`  Persons with >2 parents: ${threeParentKids.length}`);

// Check for orphans
const finalConnected = new Set();
for (const link of data.child_links) {
  finalConnected.add(link.parent_id);
  finalConnected.add(link.child_id);
}
for (const link of data.spouse_links) {
  finalConnected.add(link.person1_id);
  finalConnected.add(link.person2_id);
}
const finalOrphans = data.persons.filter(p => !finalConnected.has(p.id));
console.log(`  Orphaned persons: ${finalOrphans.length}`);

// Check for broken references
const personIdSet = new Set(data.persons.map(p => p.id));
const brokenChildLinks = data.child_links.filter(l => !personIdSet.has(l.parent_id) || !personIdSet.has(l.child_id));
const brokenSpouseLinks = data.spouse_links.filter(l => !personIdSet.has(l.person1_id) || !personIdSet.has(l.person2_id));
console.log(`  Broken child links: ${brokenChildLinks.length}`);
console.log(`  Broken spouse links: ${brokenSpouseLinks.length}`);

// Write the cleaned data
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`\n✓ Saved cleaned data to ${dataPath}`);
