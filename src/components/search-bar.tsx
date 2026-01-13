/**
 * SearchBar Component
 *
 * Global search bar with dropdown results and keyboard navigation.
 */
'use client';

import { useState, useRef, useEffect, useCallback, type ReactElement } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchPeople, type SearchResult } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSelect: (personId: string) => void;
  className?: string;
}

/**
 * SearchBar - Global search with fuzzy matching
 *
 * Features:
 * - Debounced search queries
 * - Dropdown with results
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Match highlighting
 * - Birth year display
 */
export function SearchBar({ onSelect, className }: SearchBarProps): ReactElement {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { data: results = [], isLoading } = useSearchPeople(query);

  const handleSelect = useCallback(
    (personId: string) => {
      onSelect(personId);
      setQuery('');
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  /**
   * Highlight matching text in the result
   */
  const highlightMatch = (text: string, searchQuery: string): ReactElement => {
    if (!searchQuery) return <>{text}</>;

    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return <>{text}</>;

    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-primary/30 text-foreground rounded-sm">
          {text.slice(index, index + searchQuery.length)}
        </mark>
        {text.slice(index + searchQuery.length)}
      </>
    );
  };

  /**
   * Format birth year for display
   */
  const formatBirthYear = (birthDate: unknown): string => {
    if (!birthDate || typeof birthDate !== 'object') return '';
    const date = birthDate as { year?: number };
    return date.year ? `b. ${date.year}` : '';
  };

  // Open dropdown when query is long enough (to show results or "no results" message)
  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      selectedItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const showDropdown = isOpen && query.length >= 2;

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          role="searchbox"
          placeholder="Search people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls={showDropdown ? 'search-results' : undefined}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id="search-results"
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-auto"
          role="listbox"
        >
          {results.length === 0 && !isLoading && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No results found
            </li>
          )}

          {results.map((result, index) => (
            <li
              key={result.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                'px-4 py-2 cursor-pointer hover:bg-muted transition-colors',
                index === selectedIndex && 'bg-muted'
              )}
              onClick={() => handleSelect(result.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium">
                {highlightMatch(result.displayName, query)}
              </div>
              {result.birthDate && (
                <div className="text-xs text-muted-foreground">
                  {formatBirthYear(result.birthDate)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
