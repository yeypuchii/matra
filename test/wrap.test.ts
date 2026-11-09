import { beforeAll, describe, expect, it } from 'vitest';
import { type FontStack, type Line, measure, segment, wrap } from '../src/index.ts';
import { stack } from './helpers/fonts.ts';

let latin: FontStack;
let devanagari: FontStack;
let tamil: FontStack;

beforeAll(async () => {
  latin = await stack('latin');
  devanagari = await stack('devanagari');
  tamil = await stack('tamil');
});

const SIZE = 100;

function texts(text: string, lines: Line[]): string[] {
  return lines.map((l) => text.slice(l.start, l.end));
}

function widthOf(text: string, fonts: FontStack, lang = 'en'): number {
  return measure(text, { fonts, lang, size: SIZE }).width;
}

describe('wrap', () => {
  it('keeps text that fits on one line, with the reason mandatory (the end of the text)', () => {
    const lines = wrap('Hello world', { fonts: latin, lang: 'en', size: SIZE, width: 10_000 });
    expect(lines).toEqual([
      { start: 0, end: 11, width: widthOf('Hello world', latin), reason: 'mandatory' },
    ]);
  });

  it('puts as many words on each line as fit', () => {
    const text = 'aaa bbb ccc';
    const width = widthOf('aaa bbb', latin) + 1;
    const lines = wrap(text, { fonts: latin, lang: 'en', size: SIZE, width });
    expect(texts(text, lines)).toEqual(['aaa bbb ', 'ccc']);
    expect(lines.map((l) => l.reason)).toEqual(['opportunity', 'mandatory']);
  });

  it('does not count the spaces at the end of a line', () => {
    const text = 'aaa    aaa';
    const width = widthOf('aaa', latin);
    const lines = wrap(text, { fonts: latin, lang: 'en', size: SIZE, width });
    expect(texts(text, lines)).toEqual(['aaa    ', 'aaa']);
    expect(lines[0]?.width).toBeCloseTo(width, 9);
  });

  it('breaks at each newline, and keeps the newline with the line before it', () => {
    const fonts = latin;
    const wide = { fonts, lang: 'en', size: SIZE, width: 10_000 };
    expect(texts('ab\ncd', wrap('ab\ncd', wide))).toEqual(['ab\n', 'cd']);
    expect(texts('ab\r\ncd', wrap('ab\r\ncd', wide))).toEqual(['ab\r\n', 'cd']);
    expect(texts('ab\n', wrap('ab\n', wide))).toEqual(['ab\n']);
    const blank = wrap('a\n\nb', wide);
    expect(texts('a\n\nb', blank)).toEqual(['a\n', '\n', 'b']);
    expect(blank.map((l) => l.reason)).toEqual(['mandatory', 'mandatory', 'mandatory']);
    expect(blank[1]?.width).toBe(0);
    expect(wrap('', wide)).toEqual([]);
  });

  it('breaks a word that is wider than the line at grapheme boundaries (emergency)', () => {
    const text = 'aaaaaaaaaa';
    const width = widthOf('aaa', latin) + 1;
    const lines = wrap(text, { fonts: latin, lang: 'en', size: SIZE, width });
    expect(texts(text, lines)).toEqual(['aaa', 'aaa', 'aaa', 'a']);
    expect(lines.map((l) => l.reason)).toEqual([
      'emergency',
      'emergency',
      'emergency',
      'mandatory',
    ]);
  });

  it('lets the end of a broken word share a line with the words after it', () => {
    const text = 'aaaaaaa a';
    const width = widthOf('aaaaa', latin) + 1;
    expect(texts(text, wrap(text, { fonts: latin, lang: 'en', size: SIZE, width }))).toEqual([
      'aaaaa',
      'aa a',
    ]);
  });

  it('never breaks inside a grapheme, even in an emergency', () => {
    const text = 'e\u0301e\u0301e\u0301';
    const width = widthOf('e\u0301', latin) * 1.5;
    expect(texts(text, wrap(text, { fonts: latin, lang: 'en', size: SIZE, width }))).toEqual([
      'e\u0301',
      'e\u0301',
      'e\u0301',
    ]);
  });

  it('puts a grapheme that is wider than the line on a line of its own', () => {
    const lines = wrap('ab', { fonts: latin, lang: 'en', size: SIZE, width: 1 });
    expect(texts('ab', lines)).toEqual(['a', 'b']);
    expect(lines[0]?.width).toBeGreaterThan(1);
  });

  it('breaks a Devanagari word only between syllables', () => {
    const text = 'क्षत्रियक्षत्रिय';
    const syllables = new Set(segment(text, { lang: 'hi', unit: 'syllable' }).map((s) => s.end));
    const width = widthOf('क्षत्रि', devanagari, 'hi') + 1;
    const lines = wrap(text, { fonts: devanagari, lang: 'hi', size: SIZE, width });
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(syllables.has(line.end)).toBe(true);
  });

  it('keeps a Tamil syllable of two graphemes together when it fits', () => {
    const text = 'க்ஷக்ஷக்ஷ';
    const one = widthOf('க்ஷ', tamil, 'ta');
    const lines = wrap(text, { fonts: tamil, lang: 'ta', size: SIZE, width: one * 1.5 });
    expect(texts(text, lines)).toEqual(['க்ஷ', 'க்ஷ', 'க்ஷ']);
    // Narrower than one syllable: then it breaks between the graphemes.
    const narrow = wrap('க்ஷ', { fonts: tamil, lang: 'ta', size: SIZE, width: one * 0.8 });
    expect(texts('க்ஷ', narrow)).toEqual(['க்', 'ஷ']);
  });

  it('gives the true width of a line that ends inside a ligature', () => {
    // Noto Sans has an ffi ligature. Broken after "of", the line has no ligature.
    const text = 'office';
    const width = widthOf('of', latin) + 1;
    const lines = wrap(text, { fonts: latin, lang: 'en', size: SIZE, width });
    for (const line of lines) {
      expect(line.width).toBeCloseTo(widthOf(text.slice(line.start, line.end), latin), 9);
    }
  });

  it('gives the true width of a line that starts with a mark (fault: found by fast-check)', () => {
    // Shaped on its own, the second line starts with a mark, and HarfBuzz adds a dotted circle.
    const text = 'a\t\u0bbe';
    const lines = wrap(text, { fonts: tamil, lang: 'ta', size: SIZE, width: 5 });
    expect(texts(text, lines)).toEqual(['a\t', '\u0bbe']);
    expect(lines[1]?.width).toBeCloseTo(widthOf('\u0bbe', tamil, 'ta'), 9);
  });

  it('rejects a width that is not a finite number above 0', () => {
    for (const width of [0, -5, Number.NaN]) {
      expect(() => wrap('a', { fonts: latin, lang: 'en', size: SIZE, width })).toThrow(RangeError);
    }
  });
});
