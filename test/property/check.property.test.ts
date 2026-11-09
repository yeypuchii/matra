import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { check, type FontStack } from '../../src/index.ts';
import { stack } from '../helpers/fonts.ts';
import { mixedText } from './arbitraries.ts';

let fonts: FontStack;

beforeAll(async () => {
  fonts = await stack('latin', 'devanagari', 'bengali');
});

describe('check (property)', () => {
  it('never throws, and gives sorted findings inside the text', () => {
    fc.assert(
      fc.property(mixedText(), fc.constantFrom('en', 'hi', 'bn', 'ta'), (text, lang) => {
        const findings = check(text, { fonts, lang });
        let previous = 0;
        for (const f of findings) {
          expect(f.start).toBeGreaterThanOrEqual(previous);
          expect(f.end).toBeGreaterThan(f.start);
          expect(f.end).toBeLessThanOrEqual(text.length);
          expect(f.message.length).toBeGreaterThan(0);
          previous = f.start;
        }
      }),
      { numRuns: 300 },
    );
  });
});
