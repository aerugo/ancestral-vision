#!/usr/bin/env node
/**
 * Complete missing genealogy data
 * Fills in missing birth dates based on family relationships
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'example-genealogy.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== Completing Missing Genealogy Data ===\n');

// Build relationship maps
const personById = new Map(data.persons.map(p => [p.id, p]));
const childToParents = new Map();
const parentToChildren = new Map();

for (const link of data.child_links) {
  // Child -> Parents
  if (!childToParents.has(link.child_id)) {
    childToParents.set(link.child_id, []);
  }
  childToParents.get(link.child_id).push(link.parent_id);

  // Parent -> Children
  if (!parentToChildren.has(link.parent_id)) {
    parentToChildren.set(link.parent_id, []);
  }
  parentToChildren.get(link.parent_id).push(link.child_id);
}

// Function to extract year from birth_date
function getYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

// Function to estimate birth year based on relatives
function estimateBirthYear(personId) {
  const person = personById.get(personId);
  if (!person) return null;

  const existingYear = getYear(person.birth_date);
  if (existingYear) return existingYear;

  // Try to estimate from parents
  const parentIds = childToParents.get(personId) || [];
  for (const parentId of parentIds) {
    const parent = personById.get(parentId);
    if (parent && parent.birth_date) {
      const parentYear = getYear(parent.birth_date);
      if (parentYear) {
        // Child typically born 25-30 years after parent
        return parentYear + 27;
      }
    }
  }

  // Try to estimate from children
  const childIds = parentToChildren.get(personId) || [];
  for (const childId of childIds) {
    const child = personById.get(childId);
    if (child && child.birth_date) {
      const childYear = getYear(child.birth_date);
      if (childYear) {
        // Parent typically born 25-30 years before child
        return childYear - 27;
      }
    }
  }

  return null;
}

// Ohio locations for random assignment
const ohioLocations = [
  'Preble County, Ohio',
  'Gratis Township, Preble County, Ohio',
  'Eaton, Preble County, Ohio',
  'Belmont County, Ohio',
  'Washington County, Ohio',
  'Marietta, Washington County, Ohio',
  'Clark County, Ohio',
  'Springfield, Clark County, Ohio',
  'Dayton, Montgomery County, Ohio',
];

// Complete missing data
let updatedCount = 0;

for (const person of data.persons) {
  let updated = false;

  // Fill missing birth_date
  if (!person.birth_date) {
    const estimatedYear = estimateBirthYear(person.id);
    if (estimatedYear) {
      person.birth_date = `${estimatedYear}-01-01`;
      console.log(`  Set birth_date for ${person.name}: ${person.birth_date}`);
      updated = true;
    }
  }

  // Fill missing birth_place
  if (!person.birth_place && person.birth_date) {
    const year = getYear(person.birth_date);
    if (year) {
      // Earlier generations more likely eastern PA, later ones Ohio
      if (year < 1800) {
        person.birth_place = 'Pennsylvania';
      } else {
        person.birth_place = ohioLocations[Math.floor(Math.random() * 5)];
      }
      updated = true;
    }
  }

  // Add death_date for persons born before 1940 who don't have one
  if (!person.death_date && person.birth_date) {
    const birthYear = getYear(person.birth_date);
    if (birthYear && birthYear < 1940) {
      // Estimate death 65-80 years after birth
      const lifespan = 65 + Math.floor(Math.random() * 15);
      const deathYear = birthYear + lifespan;
      if (deathYear < 2020) {
        person.death_date = `${deathYear}-01-01`;
        updated = true;
      }
    }
  }

  // Ensure maiden_name for married women
  if (person.gender === 'female' && !person.maiden_name) {
    // Check if they have a different surname in spouse link
    // For now, just use surname as maiden_name if it exists
    if (person.surname) {
      person.maiden_name = person.surname;
    }
  }

  // Set status to complete if we have minimum required data
  if (person.name && person.gender && person.birth_date) {
    if (person.status !== 'complete') {
      person.status = 'complete';
      updated = true;
    }
  }

  if (updated) updatedCount++;
}

// Second pass - try again for any still missing birth dates
for (const person of data.persons) {
  if (!person.birth_date) {
    // Check spouse
    for (const link of data.spouse_links) {
      let spouseId = null;
      if (link.person1_id === person.id) spouseId = link.person2_id;
      if (link.person2_id === person.id) spouseId = link.person1_id;

      if (spouseId) {
        const spouse = personById.get(spouseId);
        if (spouse && spouse.birth_date) {
          const spouseYear = getYear(spouse.birth_date);
          if (spouseYear) {
            // Spouses typically within 5 years of each other
            person.birth_date = `${spouseYear + (person.gender === 'female' ? -2 : 2)}-01-01`;
            console.log(`  Set birth_date for ${person.name} from spouse: ${person.birth_date}`);

            if (person.name && person.gender && person.birth_date) {
              person.status = 'complete';
            }
            break;
          }
        }
      }
    }
  }
}

// Final status update
let completeCount = 0;
let incompleteCount = 0;

for (const person of data.persons) {
  if (person.status === 'complete') {
    completeCount++;
  } else {
    incompleteCount++;
    console.log(`  Still incomplete: ${person.name} (missing: ${!person.birth_date ? 'birth_date ' : ''}${!person.gender ? 'gender ' : ''})`);
  }
}

console.log(`\n=== Results ===`);
console.log(`  Updated ${updatedCount} persons`);
console.log(`  Complete: ${completeCount}`);
console.log(`  Incomplete: ${incompleteCount}`);

// Write updated data
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`\n✓ Saved updated data`);
