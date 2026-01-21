/**
 * Citation Parser Tests
 *
 * TDD tests for parsing source citations from biography text.
 */
import { describe, it, expect } from 'vitest';
import {
  parseCitations,
  segmentBiography,
  isValidCitationId,
} from './citation-parser';

describe('parseCitations', () => {
  it('parses a single Note citation', () => {
    const text = 'Born in 1920 [Note:abc123:Birth certificate] in Ohio.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      type: 'Note',
      id: 'abc123',
      label: 'Birth certificate',
      raw: '[Note:abc123:Birth certificate]',
      startIndex: 13,
      endIndex: 44,
    });
  });

  it('parses a single Event citation', () => {
    const text = 'Married Jane [Event:evt456:Marriage ceremony] in 1945.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      type: 'Event',
      id: 'evt456',
      label: 'Marriage ceremony',
      raw: '[Event:evt456:Marriage ceremony]',
      startIndex: 13,
      endIndex: 45,
    });
  });

  it('parses a Biography citation with relationship', () => {
    const text =
      'His father was a farmer [Biography:person789:parent:occupation as farmer].';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      type: 'Biography',
      id: 'person789',
      label: 'occupation as farmer',
      relationship: 'parent',
      raw: '[Biography:person789:parent:occupation as farmer]',
      startIndex: 24,
      endIndex: 73,
    });
  });

  it('parses multiple citations in text', () => {
    const text =
      'Born [Note:n1:Birth] and married [Event:e1:Wedding] later.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(2);
    expect(result.citations[0].type).toBe('Note');
    expect(result.citations[0].id).toBe('n1');
    expect(result.citations[1].type).toBe('Event');
    expect(result.citations[1].id).toBe('e1');
  });

  it('handles citation at start of text', () => {
    const text = '[Note:abc:Start note] begins the biography.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].startIndex).toBe(0);
  });

  it('handles citation at end of text', () => {
    const text = 'The biography ends with [Note:xyz:End note]';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].endIndex).toBe(text.length);
  });

  it('handles adjacent citations', () => {
    const text = '[Note:a:First][Event:b:Second] together.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(2);
    expect(result.citations[0].endIndex).toBe(result.citations[1].startIndex);
  });

  it('skips malformed citations with missing ID', () => {
    const text = 'Invalid [Note::No ID] citation here.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(0);
  });

  it('skips malformed citations with missing label', () => {
    const text = 'Invalid [Note:abc:] citation here.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(0);
  });

  it('skips unknown citation types', () => {
    const text = 'Unknown [Photo:abc:A photo] type.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(0);
  });

  it('returns empty array for text without citations', () => {
    const text = 'A biography with no citations at all.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(0);
  });

  it('handles UUID-style IDs', () => {
    const text =
      'With UUID [Note:550e8400-e29b-41d4-a716-446655440000:Full UUID].';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('handles labels with special characters', () => {
    const text = "Citation [Note:abc:John's birth (1920)] here.";
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].label).toBe("John's birth (1920)");
  });

  it('is case-sensitive for citation types', () => {
    const text = 'Lowercase [note:abc:test] should not match.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(0);
  });
});

describe('segmentBiography', () => {
  it('returns single text segment for no citations', () => {
    const text = 'A simple biography.';
    const segments = segmentBiography(text);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: 'text',
      content: 'A simple biography.',
    });
  });

  it('splits text around a single citation', () => {
    const text = 'Born in [Note:abc:Birth] Ohio.';
    const segments = segmentBiography(text);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: 'text', content: 'Born in ' });
    expect(segments[1].type).toBe('citation');
    expect(segments[1].content).toBe('Birth');
    expect(segments[1].citation?.id).toBe('abc');
    expect(segments[2]).toEqual({ type: 'text', content: ' Ohio.' });
  });

  it('handles citation at start', () => {
    const text = '[Note:abc:Start] of text.';
    const segments = segmentBiography(text);

    expect(segments).toHaveLength(2);
    expect(segments[0].type).toBe('citation');
    expect(segments[1]).toEqual({ type: 'text', content: ' of text.' });
  });

  it('handles citation at end', () => {
    const text = 'End of [Note:abc:Citation]';
    const segments = segmentBiography(text);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: 'text', content: 'End of ' });
    expect(segments[1].type).toBe('citation');
  });

  it('handles multiple citations', () => {
    const text = '[Note:a:First] middle [Event:b:Second] end.';
    const segments = segmentBiography(text);

    expect(segments).toHaveLength(4);
    expect(segments[0].type).toBe('citation');
    expect(segments[1]).toEqual({ type: 'text', content: ' middle ' });
    expect(segments[2].type).toBe('citation');
    expect(segments[3]).toEqual({ type: 'text', content: ' end.' });
  });

  it('handles adjacent citations', () => {
    const text = '[Note:a:First][Event:b:Second]';
    const segments = segmentBiography(text);

    expect(segments).toHaveLength(2);
    expect(segments[0].type).toBe('citation');
    expect(segments[0].content).toBe('First');
    expect(segments[1].type).toBe('citation');
    expect(segments[1].content).toBe('Second');
  });

  it('preserves all text content', () => {
    const text = 'Start [Note:a:Middle] end.';
    const segments = segmentBiography(text);

    const reconstructed = segments
      .map((s) => (s.type === 'citation' ? s.citation?.raw : s.content))
      .join('');
    expect(reconstructed).toBe(text);
  });
});

describe('isValidCitationId', () => {
  it('returns true for simple alphanumeric ID', () => {
    expect(isValidCitationId('abc123')).toBe(true);
  });

  it('returns true for UUID', () => {
    expect(isValidCitationId('550e8400-e29b-41d4-a716-446655440000')).toBe(
      true
    );
  });

  it('returns true for cuid-style ID', () => {
    expect(isValidCitationId('clh1234567890abcdef')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidCitationId('')).toBe(false);
  });

  it('returns false for whitespace only', () => {
    expect(isValidCitationId('   ')).toBe(false);
  });

  it('returns false for ID with colons', () => {
    expect(isValidCitationId('abc:def')).toBe(false);
  });

  it('returns false for ID with brackets', () => {
    expect(isValidCitationId('abc[def]')).toBe(false);
  });
});
