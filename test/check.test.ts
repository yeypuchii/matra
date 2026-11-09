import { beforeAll, describe, expect, it } from 'vitest';
import { glyphFindings, hardBreakParagraphs } from '../src/check/check.ts';
import { check, type Finding, type FontStack } from '../src/index.ts';
import type { ShapedItem } from '../src/shape/shape.ts';
import { stack } from './helpers/fonts.ts';

let latin: FontStack;
let devanagari: FontStack;
let tamil: FontStack;
let thai: FontStack;
let latinBengali: FontStack;

beforeAll(async () => {
  latin = await stack('latin');
  devanagari = await stack('devanagari');
  tamil = await stack('tamil');
  thai = await stack('thai');
  latinBengali = await stack('latin', 'bengali');
});

/** Findings without the message. */
function brief(findings: Finding[]) {
  return findings.map(({ message: _, ...rest }) => rest);
}

describe('check: missing-glyph', () => {
  it('finds no fault in text that the font shows', () => {
    expect(check('Hello, world!', { fonts: latin, lang: 'en' })).toEqual([]);
    expect(check('नमस्ते दुनिया', { fonts: devanagari, lang: 'hi' })).toEqual([]);
    expect(check('สวัสดีครับ', { fonts: thai, lang: 'th' })).toEqual([]);
    expect(check('Ở Việt Nam', { fonts: latin, lang: 'vi' })).toEqual([]);
  });

  it('reports text that no font has, as one finding for neighbor clusters', () => {
    const findings = check('Hi தமிழ்!', { fonts: latin, lang: 'ta' });
    expect(brief(findings)).toEqual([{ code: 'missing-glyph', start: 3, end: 8, font: 0 }]);
    expect(findings[0]?.message).toContain('U+0BA4');
  });

  it('does not report controls, which renderers do not draw', () => {
    // Noto Sans has no glyph for LF or TAB.
    expect(check('a\nb\tc\r\nd', { fonts: latin, lang: 'en' })).toEqual([]);
  });

  it('reports a grapheme that no single font has in full', () => {
    // Noto Sans has क but not U+1CD0; Noto Sans Bengali has U+1CD0 but not क.
    const findings = check('क᳐', { fonts: latinBengali, lang: 'hi' });
    expect(brief(findings)).toEqual([{ code: 'missing-glyph', start: 0, end: 2, font: 0 }]);
    expect(findings[0]?.message).toContain('U+1CD0');
  });
});

describe('check: broken-cluster', () => {
  it('reports a vowel sign with no base letter', () => {
    const findings = check('ि', { fonts: devanagari, lang: 'hi' });
    expect(brief(findings)).toEqual([{ code: 'broken-cluster', start: 0, end: 1, font: 0 }]);
    expect(findings[0]?.message).toContain('U+093F');
  });

  it('reports a vowel sign after a space, with the space: they are one cluster', () => {
    // U+093F is a spacing mark, so the space and the sign are one grapheme (UAX #29 GB9a).
    expect(brief(check('क ि', { fonts: devanagari, lang: 'hi' }))).toEqual([
      { code: 'broken-cluster', start: 1, end: 3, font: 0 },
    ]);
  });

  it('reports a Tamil virama with no base', () => {
    expect(brief(check('்க', { fonts: tamil, lang: 'ta' }))).toEqual([
      { code: 'broken-cluster', start: 0, end: 1, font: 0 },
    ]);
  });

  it('reports a combining mark at the start of the text or of a line', () => {
    expect(brief(check('́a', { fonts: latin, lang: 'en' }))).toEqual([
      { code: 'broken-cluster', start: 0, end: 1, font: 0 },
    ]);
    expect(brief(check('a\ńb', { fonts: latin, lang: 'en' }))).toEqual([
      { code: 'broken-cluster', start: 2, end: 3, font: 0 },
    ]);
  });

  it('does not report a dotted circle that is in the input', () => {
    expect(check('◌ि', { fonts: devanagari, lang: 'hi' })).toEqual([]);
  });

  it('reports glyph 0 where the font has the code points, when the font has no dotted circle', () => {
    const font = { dottedCircle: undefined, hasCodePoint: () => true };
    const item: ShapedItem = {
      font: 0,
      script: 'Deva',
      start: 0,
      end: 1,
      glyphs: [
        { id: 0, cluster: 0, xAdvance: 500, yAdvance: 0, xOffset: 0, yOffset: 0, flags: 0 },
        { id: 7, cluster: 0, xAdvance: 300, yAdvance: 0, xOffset: 0, yOffset: 0, flags: 0 },
      ],
    };
    expect(brief(glyphFindings('ि', item, font))).toEqual([
      { code: 'broken-cluster', start: 0, end: 1, font: 0 },
    ]);
  });
});

describe('check: font-fallback', () => {
  it('reports a run in a font that is not font 0', () => {
    const findings = check('Hello বাংলা', { fonts: latinBengali, lang: 'bn' });
    expect(brief(findings)).toEqual([{ code: 'font-fallback', start: 6, end: 11, font: 1 }]);
    expect(findings[0]?.message).toContain('font 1');
  });

  it('reports each run, in the order of the text, with the other findings', () => {
    const text = 'বাংলা தமிழ் বাংলা';
    expect(brief(check(text, { fonts: latinBengali, lang: 'bn' }))).toEqual([
      { code: 'font-fallback', start: 0, end: 5, font: 1 },
      { code: 'missing-glyph', start: 6, end: 11, font: 0 },
      { code: 'font-fallback', start: 12, end: 17, font: 1 },
    ]);
  });

  it('checks each line of the input as its own text', () => {
    expect(brief(check('Hello\nবাংলা\r\nবাংলা', { fonts: latinBengali, lang: 'bn' }))).toEqual([
      { code: 'font-fallback', start: 6, end: 11, font: 1 },
      { code: 'font-fallback', start: 13, end: 18, font: 1 },
    ]);
  });
});

describe('check', () => {
  it('returns nothing for empty text', () => {
    expect(check('', { fonts: latin, lang: 'en' })).toEqual([]);
  });

  it('rejects bad options', () => {
    expect(() => check('a', { fonts: { length: 1 }, lang: 'en' })).toThrow(TypeError);
    expect(() => check('a', { fonts: latin, lang: '' })).toThrow(TypeError);
  });
});

describe('hardBreakParagraphs', () => {
  it('splits at each mandatory break, and keeps the break with the line before it', () => {
    expect(hardBreakParagraphs('a\nb\r\nc\rd e\u0085f\u000bg\fh')).toEqual([
      [0, 1, 2],
      [2, 3, 5],
      [5, 6, 7],
      [7, 8, 9],
      [9, 10, 11],
      [11, 12, 13],
      [13, 14, 15],
      [15, 16, 16],
    ]);
    expect(hardBreakParagraphs('')).toEqual([]);
    expect(hardBreakParagraphs('ab\n')).toEqual([
      [0, 2, 3],
      [3, 3, 3],
    ]);
  });
});
