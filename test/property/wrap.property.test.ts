import fc from 'fast-check';
import { beforeAll, describe, expect, it } from 'vitest';
import { type FontStack, measure, segment, wrap } from '../../src/index.ts';
import { stack } from '../helpers/fonts.ts';
import { mixedText } from './arbitraries.ts';

let fonts: FontStack;

beforeAll(async () => {
  fonts = await stack('latin', 'devanagari', 'bengali', 'tamil');
});

const SIZE = 50;
const lang = fc.constantFrom('en', 'hi', 'bn', 'ta');
const width = fc.integer({ min: 5, max: 1500 });

/** The characters that hang at the end of a line in wrap: spaces, but not no-break spaces. */
const HANGING = /[ \u1680\u2000-\u2006\u2008-\u200a\u205f\u3000\p{Cc}\p{DI}\p{Zl}\p{Zp}]+$/u;

describe('wrap (property)', () => {
  it('gives lines that, joined, give the input again', () => {
    fc.assert(
      fc.property(mixedText(40), lang, width, (text, lang, width) => {
        const lines = wrap(text, { fonts, lang, size: SIZE, width });
        expect(lines.map((l) => text.slice(l.start, l.end)).join('')).toBe(text);
        for (const [i, line] of lines.entries()) {
          expect(line.end).toBeGreaterThan(line.start);
          if (i > 0) expect(line.start).toBe(lines[i - 1]?.end);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('never breaks inside a grapheme', () => {
    fc.assert(
      fc.property(mixedText(40), lang, width, (text, lang, width) => {
        const graphemes = new Set(segment(text, { lang, unit: 'grapheme' }).map((s) => s.end));
        for (const line of wrap(text, { fonts, lang, size: SIZE, width })) {
          expect({ text, end: line.end, ok: graphemes.has(line.end) }).toEqual({
            text,
            end: line.end,
            ok: true,
          });
        }
      }),
      { numRuns: 300 },
    );
  });

  it('gives each line the width it has when it is shaped on its own', () => {
    fc.assert(
      fc.property(mixedText(40), lang, width, (text, lang, width) => {
        for (const line of wrap(text, { fonts, lang, size: SIZE, width })) {
          const visible = text.slice(line.start, line.end).replace(HANGING, '');
          const alone = measure(visible, { fonts, lang, size: SIZE }).width;
          expect({ text, line, width: line.width }).toEqual({
            text,
            line,
            width: expect.closeTo(alone, 6),
          });
        }
      }),
      { numRuns: 300 },
    );
  });

  it('keeps each line inside the width, unless the line is one grapheme', () => {
    fc.assert(
      fc.property(mixedText(40), lang, width, (text, lang, width) => {
        for (const line of wrap(text, { fonts, lang, size: SIZE, width })) {
          if (line.width <= width + 1e-6) continue;
          const visible = text.slice(line.start, line.end).replace(HANGING, '');
          const graphemes = segment(visible, { lang, unit: 'grapheme' }).length;
          expect({ text, line, graphemes }).toEqual({ text, line, graphemes: 1 });
        }
      }),
      { numRuns: 300 },
    );
  });
});
