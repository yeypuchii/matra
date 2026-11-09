import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { type FontStack, shape } from '../../src/index.ts';
import { stack } from '../helpers/fonts.ts';
import { mixedText } from './arbitraries.ts';

let fonts: FontStack;

beforeAll(async () => {
  fonts = await stack('latin', 'devanagari', 'bengali', 'tamil');
});

describe('shape (property)', () => {
  it('never throws, and its runs cover the input with no gap and no overlap', () => {
    fc.assert(
      fc.property(mixedText(), fc.constantFrom('en', 'hi', 'bn', 'ta', 'vi'), (text, lang) => {
        const runs = shape(text, { fonts, lang });
        let at = 0;
        for (const run of runs) {
          expect(run.start).toBe(at);
          expect(run.end).toBeGreaterThan(run.start);
          expect(run.font).toBeGreaterThanOrEqual(0);
          expect(run.font).toBeLessThan(fonts.length);
          for (const glyph of run.glyphs) {
            expect(glyph.cluster).toBeGreaterThanOrEqual(run.start);
            expect(glyph.cluster).toBeLessThan(run.end);
          }
          at = run.end;
        }
        expect(at).toBe(text.length);
      }),
      { numRuns: 300 },
    );
  });
});
