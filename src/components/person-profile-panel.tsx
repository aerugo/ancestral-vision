/**
 * PersonProfilePanel Component (INV-U004: Slide-in Profile Panel)
 *
 * A slide-in panel that displays person details when selected in the 3D constellation.
 * Maintains 3D context by not covering the entire screen.
 */
'use client';

import { useState, type ReactElement } from 'react';
import { X, Pencil } from 'lucide-react';
import { useSelectionStore } from '@/store/selection-store';
import { usePerson } from '@/hooks/use-people';
import { usePersonRelationships } from '@/hooks/use-relationships';
import { Button } from '@/components/ui/button';
import { PersonBioTab } from './person-bio-tab';
import { PersonNotesTab } from './person-notes-tab';
import { PersonEventsTab } from './person-events-tab';
import { PersonMediaTab } from './person-media-tab';
import { AddRelationshipDialog, type RelationshipType } from './add-relationship-dialog';
import { EditPersonDialog } from './edit-person-dialog';
import type {
  Relationship,
  ParentChildRelationship,
  SpouseRelationship,
} from '@/hooks/use-relationships';
import type { FlexibleDate } from '@/lib/schemas/person';

/**
 * Format a FlexibleDate object into a human-readable string
 */
function formatFlexibleDate(date: FlexibleDate | null | undefined): string | null {
  if (!date || !date.year) return null;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  let dateStr = '';

  // Format main date part
  if (date.day && date.month) {
    dateStr = `${date.day} ${monthNames[date.month - 1]} ${date.year}`;
  } else if (date.month) {
    dateStr = `${monthNames[date.month - 1]} ${date.year}`;
  } else {
    dateStr = `${date.year}`;
  }

  // Add prefix/suffix based on type
  switch (date.type) {
    case 'approximate':
      return `c. ${dateStr}`;
    case 'before':
      return `before ${dateStr}`;
    case 'after':
      return `after ${dateStr}`;
    case 'range':
      if (date.endYear) {
        let endStr = '';
        if (date.endDay && date.endMonth) {
          endStr = `${date.endDay} ${monthNames[date.endMonth - 1]} ${date.endYear}`;
        } else if (date.endMonth) {
          endStr = `${monthNames[date.endMonth - 1]} ${date.endYear}`;
        } else {
          endStr = `${date.endYear}`;
        }
        return `${dateStr} – ${endStr}`;
      }
      return dateStr;
    default:
      return dateStr;
  }
}

/**
 * Person type from relationships
 */
interface RelatedPerson {
  id: string;
  givenName: string | null;
  surname?: string | null;
}

/**
 * Type guard for parent-child relationship
 */
function isParentChildRelationship(rel: Relationship): rel is ParentChildRelationship {
  return 'parentId' in rel && 'childId' in rel;
}

/**
 * Type guard for spouse relationship
 */
function isSpouseRelationship(rel: Relationship): rel is SpouseRelationship {
  return 'person1Id' in rel && 'person2Id' in rel;
}

/**
 * Extract parents, children, and spouses from relationships
 */
function processRelationships(
  relationships: Relationship[],
  personId: string
): {
  parents: RelatedPerson[];
  children: RelatedPerson[];
  spouses: RelatedPerson[];
} {
  const parents: RelatedPerson[] = [];
  const children: RelatedPerson[] = [];
  const spouses: RelatedPerson[] = [];

  for (const rel of relationships) {
    if (isParentChildRelationship(rel)) {
      // If this person is the child, the other is a parent
      if (rel.childId === personId) {
        parents.push({
          id: rel.parent.id,
          givenName: rel.parent.givenName,
          surname: rel.parent.surname,
        });
      }
      // If this person is the parent, the other is a child
      if (rel.parentId === personId) {
        children.push({
          id: rel.child.id,
          givenName: rel.child.givenName,
          surname: rel.child.surname,
        });
      }
    } else if (isSpouseRelationship(rel)) {
      // Find the spouse (the other person in the relationship)
      if (rel.person1Id === personId) {
        spouses.push({
          id: rel.person2.id,
          givenName: rel.person2.givenName,
          surname: rel.person2.surname,
        });
      } else if (rel.person2Id === personId) {
        spouses.push({
          id: rel.person1.id,
          givenName: rel.person1.givenName,
          surname: rel.person1.surname,
        });
      }
    }
  }

  return { parents, children, spouses };
}

/**
 * PersonProfilePanel - Slide-in panel for viewing person details
 *
 * Features:
 * - Slides in from right (INV-U004)
 * - Shows person details and dates
 * - Tabbed interface for Events, Notes, Photos
 * - Displays immediate family members
 * - Dark theme styling (INV-U001)
 */
type TabId = 'bio' | 'events' | 'notes' | 'photos';

export function PersonProfilePanel(): ReactElement | null {
  const { selectedPersonId, isPanelOpen, clearSelection } = useSelectionStore();
  const {
    data: person,
    isLoading: isPersonLoading,
    isError: isPersonError,
  } = usePerson(selectedPersonId);
  const {
    data: relationships,
    isLoading: isRelationshipsLoading,
    isError: isRelationshipsError,
  } = usePersonRelationships(selectedPersonId);
  const [activeTab, setActiveTab] = useState<TabId>('bio');
  const [addingRelation, setAddingRelation] = useState<RelationshipType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Don't render if no selection or panel closed
  if (!selectedPersonId || !isPanelOpen) {
    return null;
  }

  const isLoading = isPersonLoading || isRelationshipsLoading;
  const isError = isPersonError || isRelationshipsError;
  const notFound = !isLoading && !isError && !person;

  // Build display name
  const displayName = person
    ? [person.givenName, person.surname].filter(Boolean).join(' ')
    : notFound
      ? 'Person not found'
      : isError
        ? 'Error loading'
        : 'Loading...';

  // Process relationships to extract family members
  const { parents, children, spouses } = processRelationships(
    relationships || [],
    selectedPersonId
  );

  const hasFamily = parents.length > 0 || children.length > 0 || spouses.length > 0;

  return (
    <aside
      role="complementary"
      className={`fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg transform transition-transform duration-300 z-50 ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold truncate">{displayName}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditDialogOpen(true)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-4">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : isError ? (
        <div className="p-4">
          <p className="text-destructive">Failed to load person details. Please try again.</p>
        </div>
      ) : notFound ? (
        <div className="p-4">
          <p className="text-muted-foreground">This person could not be found.</p>
        </div>
      ) : person ? (
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          {/* Birth/Death Dates */}
          <div className="space-y-1 mb-4">
            {person.birthDate && formatFlexibleDate(person.birthDate as FlexibleDate) && (
              <p className="text-sm text-muted-foreground">
                Born: {formatFlexibleDate(person.birthDate as FlexibleDate)}
              </p>
            )}
            {person.deathDate && formatFlexibleDate(person.deathDate as FlexibleDate) && (
              <p className="text-sm text-muted-foreground">
                Died: {formatFlexibleDate(person.deathDate as FlexibleDate)}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b mb-4" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'bio'}
              onClick={() => setActiveTab('bio')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'bio'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bio
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'events'}
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'events'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Events
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'notes'}
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'notes'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Notes
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'photos'}
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'photos'
                  ? 'border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Photos
            </button>
          </div>

          {/* Tab Content */}
          <div className="mb-4 flex-1 overflow-hidden">
            {activeTab === 'bio' && selectedPersonId && (
              <PersonBioTab
                personId={selectedPersonId}
                personName={displayName}
                biography={person.biography}
              />
            )}
            {activeTab === 'events' && selectedPersonId && (
              <PersonEventsTab personId={selectedPersonId} />
            )}
            {activeTab === 'notes' && selectedPersonId && (
              <PersonNotesTab personId={selectedPersonId} />
            )}
            {activeTab === 'photos' && selectedPersonId && (
              <PersonMediaTab personId={selectedPersonId} />
            )}
          </div>

          {/* Family Members */}
          {hasFamily && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Family</h3>
              <div className="space-y-2">
                {/* Parents */}
                {parents.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Parents
                    </p>
                    {parents.map((parent) => (
                      <button
                        key={parent.id}
                        className="block text-sm hover:text-primary transition-colors"
                      >
                        {parent.givenName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Spouses */}
                {spouses.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Spouse
                    </p>
                    {spouses.map((spouse) => (
                      <button
                        key={spouse.id}
                        className="block text-sm hover:text-primary transition-colors"
                      >
                        {spouse.givenName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Children */}
                {children.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Children
                    </p>
                    {children.map((child) => (
                      <button
                        key={child.id}
                        className="block text-sm hover:text-primary transition-colors"
                      >
                        {child.givenName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Relationship Buttons */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Add Family Member</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingRelation('parent')}
              >
                + Add Parent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingRelation('child')}
              >
                + Add Child
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingRelation('spouse')}
              >
                + Add Spouse
              </Button>
            </div>
          </div>

          {/* Add Relationship Dialog */}
          {addingRelation && selectedPersonId && (
            <AddRelationshipDialog
              personId={selectedPersonId}
              relationshipType={addingRelation}
              onClose={() => setAddingRelation(null)}
            />
          )}

          {/* Edit Person Dialog */}
          {isEditDialogOpen && selectedPersonId && (
            <EditPersonDialog
              personId={selectedPersonId}
              onClose={() => setIsEditDialogOpen(false)}
            />
          )}
        </div>
      ) : null}
    </aside>
  );
}
