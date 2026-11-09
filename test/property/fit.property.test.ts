import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { type FontStack, fit } from '../../src/index.ts';
import { stack } from '../helpers/fonts.ts';
import { mixedText } from './arbitraries.ts';

let fonts: FontStack;

beforeAll(async () => {
  fonts = await stack('latin', 'devanagari', 'bengali', 'tamil');
});

const input = fc.record({
  text: mixedText(30),
  lang: fc.constantFrom('en', 'hi', 'bn', 'ta'),
  width: fc.integer({ min: 10, max: 600 }),
  height: fc.integer({ min: 10, max: 400 }),
  minSize: fc.integer({ min: 4, max: 20 }),
  range: fc.integer({ min: 0, max: 40 }),
  maxLines: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  lineHeight: fc.constantFrom(1, 1.2, 1.5),
});

describe('fit (property)', () => {
  it('returns a size inside the limits, and a fit that keeps every rule', () => {
    fc.assert(
      fc.property(input, ({ text, lang, width, height, minSize, range, maxLines, lineHeight }) => {
        const maxSize = minSize + range;
        const r = fit(text, {
          fonts,
          lang,
          box: { width, height },
          minSize,
          maxSize,
          lineHeight,
          ...(maxLines === undefined ? {} : { maxLines }),
        });
        expect(r.size).toBeGreaterThanOrEqual(minSize);
        expect(r.size).toBeLessThanOrEqual(maxSize);
        expect(r.overflowX).toBeGreaterThanOrEqual(0);
        expect(r.overflowY).toBeGreaterThanOrEqual(0);
        if (r.fits) {
          expect(r.overflowX).toBe(0);
          expect(r.lines.every((l) => l.reason !== 'emergency')).toBe(true);
          expect(r.lines.every((l) => l.width <= width + 1e-6)).toBe(true);
          expect(r.lines.length * r.size * lineHeight).toBeLessThanOrEqual(height + 1e-6);
          if (maxLines !== undefined) expect(r.lines.length).toBeLessThanOrEqual(maxLines);
        } else {
          expect(r.size).toBe(minSize);
          expect(r.overflowX + r.overflowY).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });
});
