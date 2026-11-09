import { beforeAll, describe, expect, it } from 'vitest';
import { internals } from '../src/font/stack.ts';
import { type FontStack, measure } from '../src/index.ts';
import { stack } from './helpers/fonts.ts';

let latin: FontStack;
let devanagari: FontStack;
let latinBengali: FontStack;

beforeAll(async () => {
  latin = await stack('latin');
  devanagari = await stack('devanagari');
  latinBengali = await stack('latin', 'bengali');
});

// All the fixture fonts have 1000 units per em, so at size 1000 a pixel is a font unit.
const UNITS = 1000;

describe('measure', () => {
  it('gives the advance width, scaled from font units to pixels', () => {
    expect(measure('a', { fonts: latin, lang: 'en', size: UNITS }).width).toBe(561);
    expect(measure('a', { fonts: latin, lang: 'en', size: 16 }).width).toBeCloseTo(8.976, 10);
  });

  it('measures shaped text, not the sum of the characters', () => {
    // कि: the i-matra glyph (259) and the consonant (768), in Noto Sans Devanagari.
    expect(measure('कि', { fonts: devanagari, lang: 'hi', size: UNITS }).width).toBe(1027);
  });

  it('gives ascent and descent from the font, positive', () => {
    const m = measure('a', { fonts: latin, lang: 'en', size: UNITS });
    expect(m.ascent).toBe(1069);
    expect(m.descent).toBe(293);
  });

  it('takes the largest ascent and descent of the fonts that the text uses', () => {
    const [latinFont, bengaliFont] = internals(latinBengali).fonts;
    const only = measure('ab', { fonts: latinBengali, lang: 'bn', size: UNITS });
    expect(only.ascent).toBe(latinFont?.ascent);
    const mixed = measure('a বা', { fonts: latinBengali, lang: 'bn', size: UNITS });
    expect(mixed.ascent).toBe(Math.max(latinFont?.ascent ?? 0, bengaliFont?.ascent ?? 0));
    expect(mixed.descent).toBe(Math.max(latinFont?.descent ?? 0, bengaliFont?.descent ?? 0));
  });

  it('gives the ink extents above and below the baseline', () => {
    const x = measure('x', { fonts: latin, lang: 'en', size: UNITS });
    expect(x.inkTop).toBe(536);
    expect(x.inkBottom).toBe(0);
    const o = measure('Ở', { fonts: latin, lang: 'vi', size: UNITS });
    expect(o.inkTop).toBe(999);
    expect(o.inkBottom).toBe(10);
  });

  it('includes the y offsets of stacked marks in the ink', () => {
    const one = measure('e\u0302', { fonts: latin, lang: 'vi', size: UNITS });
    const two = measure('e\u0302\u0301', { fonts: latin, lang: 'vi', size: UNITS });
    expect(two.inkTop).toBeGreaterThan(one.inkTop);
  });

  it('gives ink that does not reach the baseline as a negative number', () => {
    // A degree sign is all above the baseline.
    expect(measure('°', { fonts: latin, lang: 'en', size: UNITS }).inkBottom).toBeLessThan(0);
  });

  it('gives no width and no ink to control characters', () => {
    const a = measure('a', { fonts: latin, lang: 'en', size: UNITS });
    expect(measure('a\n', { fonts: latin, lang: 'en', size: UNITS })).toEqual(a);
    expect(measure('\t', { fonts: latin, lang: 'en', size: UNITS }).width).toBe(0);
  });

  it('gives zero width and ink, and the metrics of font 0, for empty text', () => {
    expect(measure('', { fonts: latin, lang: 'en', size: UNITS })).toEqual({
      width: 0,
      ascent: 1069,
      descent: 293,
      inkTop: 0,
      inkBottom: 0,
    });
  });

  it('rejects a size that is not a finite number above 0', () => {
    for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => measure('a', { fonts: latin, lang: 'en', size })).toThrow(RangeError);
    }
  });
});
