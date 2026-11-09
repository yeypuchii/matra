import { beforeAll, describe, expect, it } from 'vitest';
import { NEUTRAL_SCRIPT, scriptOf } from '../src/font/script.ts';
import { internals } from '../src/font/stack.ts';
import { type FontStack, type GlyphRun, shape } from '../src/index.ts';
import { stack } from './helpers/fonts.ts';

let latin: FontStack;
let devanagari: FontStack;
let latinBengali: FontStack;
let latinDevanagari: FontStack;
let scLatin: FontStack;

beforeAll(async () => {
  latin = await stack('latin');
  devanagari = await stack('devanagari');
  latinBengali = await stack('latin', 'bengali');
  latinDevanagari = await stack('latin', 'devanagari');
  scLatin = await stack('sc', 'latin');
});

/** Runs without glyphs: font, start, end. */
function runs(result: GlyphRun[]) {
  return result.map(({ font, start, end }) => ({ font, start, end }));
}

describe('shape', () => {
  it('returns one run for text that one font covers', () => {
    const result = shape('Hello', { fonts: latin, lang: 'en' });
    expect(runs(result)).toEqual([{ font: 0, start: 0, end: 5 }]);
    expect(result[0]?.glyphs).toHaveLength(5);
  });

  it('gives positions in font units, not scaled', () => {
    const [run] = shape('a', { fonts: latin, lang: 'en' });
    const upem = internals(latin).fonts[0]?.upem;
    expect(upem).toBe(1000);
    expect(run?.glyphs[0]?.xAdvance).toBe(561); // Noto Sans 'a'
  });

  it('gives clusters as UTF-16 offsets into the input string', () => {
    const [run] = shape('a😀b', { fonts: latin, lang: 'en' });
    expect(run?.glyphs.map((g) => g.cluster)).toEqual([0, 1, 3]);
  });

  it('gives clusters as UTF-16 offsets in a run that does not start at 0', () => {
    const result = shape('😀 বাংলা', { fonts: latinBengali, lang: 'bn' });
    expect(runs(result)).toEqual([
      { font: 0, start: 0, end: 3 },
      { font: 1, start: 3, end: 8 },
    ]);
    const clusters = result[1]?.glyphs.map((g) => g.cluster) ?? [];
    expect(Math.min(...clusters)).toBe(3);
    expect(clusters.every((c) => c >= 3 && c < 8)).toBe(true);
  });

  it('puts each grapheme in the first font that has all its code points', () => {
    // Noto Sans has क and ख, but not the Vedic tone mark U+1CD0.
    const result = shape('क\u1cd0ख', { fonts: latinDevanagari, lang: 'hi' });
    expect(runs(result)).toEqual([
      { font: 1, start: 0, end: 2 },
      { font: 0, start: 2, end: 3 },
    ]);
  });

  it('joins neighbor graphemes that use the same font into one run', () => {
    const result = shape('Hello বাংলা world', { fonts: latinBengali, lang: 'bn' });
    expect(runs(result)).toEqual([
      { font: 0, start: 0, end: 6 },
      { font: 1, start: 6, end: 11 },
      { font: 0, start: 11, end: 17 },
    ]);
  });

  it('uses font 0 for a grapheme that no font has', () => {
    const result = shape('தமிழ்', { fonts: latinBengali, lang: 'ta' });
    expect(runs(result)).toEqual([{ font: 0, start: 0, end: 5 }]);
    expect(result[0]?.glyphs.every((g) => g.id === 0)).toBe(true);
  });

  it('ignores default-ignorable code points when it picks the font', () => {
    // Noto Sans SC has 'a' and 'b' but no ZWJ, ZWNJ or VS16.
    for (const text of ['a\u200db', 'a\u200cb', 'a\ufe0fb']) {
      expect(runs(shape(text, { fonts: scLatin, lang: 'en' }))).toEqual([
        { font: 0, start: 0, end: 3 },
      ]);
    }
  });

  it('keeps a control character in the run of the text before it', () => {
    const result = shape('বাংলা\nবাংলা', { fonts: latinBengali, lang: 'bn' });
    expect(runs(result)).toEqual([{ font: 1, start: 0, end: 11 }]);
  });

  it('shapes each script with its own shaper, inside one font run', () => {
    // Noto Sans has Latin and Devanagari. Shaped as Latin, the i-matra would not move.
    const mixed = shape('ab कि', { fonts: latin, lang: 'hi' });
    expect(runs(mixed)).toEqual([{ font: 0, start: 0, end: 5 }]);
    const alone = shape('कि', { fonts: latin, lang: 'hi' })[0]?.glyphs.map((g) => g.id) ?? [];
    expect(alone).toHaveLength(2);
    expect(mixed[0]?.glyphs.slice(-2).map((g) => g.id)).toEqual(alone);
  });

  it('gives common characters (spaces, digits, punctuation) the script of the text before', () => {
    const result = shape('कि 12, कि', { fonts: devanagari, lang: 'hi' });
    expect(runs(result)).toEqual([{ font: 0, start: 0, end: 9 }]);
  });

  it('gives the language to HarfBuzz', () => {
    // Noto Sans has a Serbian form of б (locl).
    const ru = shape('б', { fonts: latin, lang: 'ru' })[0]?.glyphs[0]?.id;
    const sr = shape('б', { fonts: latin, lang: 'sr' })[0]?.glyphs[0]?.id;
    expect(ru).toBeDefined();
    expect(sr).not.toBe(ru);
  });

  it('applies features', () => {
    const on = shape('office', { fonts: latin, lang: 'en' })[0]?.glyphs ?? [];
    const off = shape('office', { fonts: latin, lang: 'en', features: ['liga=0'] })[0]?.glyphs;
    expect(on.length).toBeLessThan(6);
    expect(off).toHaveLength(6);
  });

  it('returns no runs for empty text', () => {
    expect(shape('', { fonts: latin, lang: 'en' })).toEqual([]);
  });

  it('rejects bad options', () => {
    expect(() => shape('a', { fonts: { length: 1 }, lang: 'en' })).toThrow(TypeError);
    expect(() => shape('a', { fonts: latin, lang: 'not a tag!' })).toThrow(RangeError);
    expect(() => shape('a', { fonts: latin, lang: 'en', features: ['not a feature'] })).toThrow(
      /not a valid OpenType feature/,
    );
    // @ts-expect-error: wrong type on purpose.
    expect(() => shape(42, { fonts: latin, lang: 'en' })).toThrow(TypeError);
  });
});

describe('scriptOf', () => {
  it('gives the ISO 15924 code, or the neutral code for Common and Inherited', () => {
    const cases: [string, string][] = [
      ['a', 'Latn'],
      ['Ω', 'Grek'],
      ['б', 'Cyrl'],
      ['क', 'Deva'],
      ['ক', 'Beng'],
      ['க', 'Taml'],
      ['ب', 'Arab'],
      ['中', 'Hani'],
      ['あ', 'Hira'],
      ['ꯀ', 'Mtei'],
      ['1', NEUTRAL_SCRIPT],
      [' ', NEUTRAL_SCRIPT],
      ['।', NEUTRAL_SCRIPT], // the danda is Common, used by many scripts
      ['\u0301', NEUTRAL_SCRIPT], // Inherited
    ];
    for (const [char, code] of cases) {
      expect([char, scriptOf(char.codePointAt(0) as number)]).toEqual([char, code]);
    }
  });
});
