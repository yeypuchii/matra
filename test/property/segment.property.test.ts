import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { segment } from '../../src/index.ts';
import { mixedText } from './arbitraries.ts';

describe('segment (property)', () => {
  it('gives segments that cover the input with no gap and no overlap, for each unit', () => {
    fc.assert(
      fc.property(
        mixedText(),
        fc.constantFrom('grapheme', 'word', 'sentence', 'syllable'),
        fc.constantFrom('en', 'hi', 'bn', 'ta'),
        (text, unit, lang) => {
          let at = 0;
          for (const s of segment(text, { lang, unit })) {
            expect(s.start).toBe(at);
            expect(s.end).toBeGreaterThan(s.start);
            at = s.end;
          }
          expect(at).toBe(text.length);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('gives syllables of one or more whole graphemes', () => {
    fc.assert(
      fc.property(mixedText(), fc.constantFrom('hi', 'bn', 'ta'), (text, lang) => {
        const graphemes = new Set(segment(text, { lang, unit: 'grapheme' }).map((s) => s.end));
        for (const s of segment(text, { lang, unit: 'syllable' })) {
          expect({ text, end: s.end, atGrapheme: graphemes.has(s.end) }).toEqual({
            text,
            end: s.end,
            atGrapheme: true,
          });
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('keeps a mixed-script grapheme whole', () => {
    // Found by the property test above. Bengali ssa, Tamil virama, Devanagari virama and ra
    // are one grapheme (GB9c); Devanagari ra, Tamil aa, Bengali virama and ya too.
    for (const text of ['\u09b7\u0bcd\u094d\u0930', '\u0930\u0bbe\u09cd\u09af']) {
      expect(segment(text, { lang: 'hi', unit: 'syllable' })).toEqual([
        { start: 0, end: text.length },
      ]);
    }
  });
});
