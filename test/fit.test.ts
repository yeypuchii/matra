import { beforeAll, describe, expect, it } from 'vitest';
import { type FitOptions, type FontStack, fit, measure, wrap } from '../src/index.ts';
import { stack } from './helpers/fonts.ts';

let latin: FontStack;

beforeAll(async () => {
  latin = await stack('latin');
});

function options(over: Partial<FitOptions> & Pick<FitOptions, 'box'>): FitOptions {
  return { fonts: latin, lang: 'en', minSize: 8, maxSize: 40, ...over };
}

const wide = 100_000;

describe('fit', () => {
  it('finds the largest size, in steps of 0.25 px, at which the text fits the width', () => {
    const width = measure('aaa', { fonts: latin, lang: 'en', size: 20 }).width;
    const result = fit('aaa', options({ box: { width, height: wide } }));
    expect(result).toMatchObject({ size: 20, fits: true, overflowX: 0, overflowY: 0 });
    expect(result.findings).toEqual([]);
    expect(result.lines).toHaveLength(1);
  });

  it('gives maxSize when the text fits at maxSize', () => {
    const result = fit('a', options({ box: { width: wide, height: wide }, maxSize: 32.1 }));
    expect(result.size).toBe(32.1);
    expect(result.fits).toBe(true);
  });

  it('keeps the line count × size × lineHeight inside the height', () => {
    // One line: 1 × size × 1.2 <= 30, so size <= 25.
    expect(fit('aaa', options({ box: { width: wide, height: 30 } })).size).toBe(25);
    // lineHeight 1.5: size <= 20.
    expect(fit('aaa', options({ box: { width: wide, height: 30 }, lineHeight: 1.5 })).size).toBe(
      20,
    );
  });

  it('keeps the line count at or under maxLines', () => {
    const width = measure('aaa aaa', { fonts: latin, lang: 'en', size: 20 }).width - 1;
    const result = fit('aaa aaa', options({ box: { width, height: wide }, maxLines: 1 }));
    expect(result.fits).toBe(true);
    expect(result.lines).toHaveLength(1);
    const bigger = { fonts: latin, lang: 'en', size: result.size + 0.25, width };
    expect(wrap('aaa aaa', bigger).length).toBe(2);
  });

  it('does not count a size as a fit when a word must break inside', () => {
    const width = measure('aaaa', { fonts: latin, lang: 'en', size: 20 }).width;
    // At 20 px "aaaa" fits; at any larger size it would need an emergency break.
    expect(fit('aaaa', options({ box: { width, height: wide } })).size).toBe(20);
  });

  it('returns the minSize result, with the overflow, when no size fits the width', () => {
    const result = fit('aaaaaaaaaa', options({ box: { width: 10, height: wide } }));
    const word = measure('aaaaaaaaaa', { fonts: latin, lang: 'en', size: 8 }).width;
    expect(result.fits).toBe(false);
    expect(result.size).toBe(8);
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.overflowX).toBeCloseTo(word - 10, 9);
    expect(result.findings.map(({ message: _, ...f }) => f)).toEqual([
      { code: 'overflow-x', start: 0, end: 10 },
    ]);
  });

  it('returns the minSize result, with the overflow, when no size fits the height', () => {
    const text = 'a\na\na\na';
    const result = fit(text, options({ box: { width: wide, height: 20 } }));
    expect(result.fits).toBe(false);
    expect(result.size).toBe(8);
    expect(result.lines).toHaveLength(4);
    expect(result.overflowY).toBeCloseTo(4 * 8 * 1.2 - 20, 9);
    // Two lines of 9.6 px fit in 20 px; the third line starts at offset 4.
    expect(result.findings.map(({ message: _, ...f }) => f)).toEqual([
      { code: 'overflow-y', start: 4, end: 7 },
    ]);
  });

  it('gives the extra lines as the overflow when there are more lines than maxLines', () => {
    const result = fit('a\na\na', options({ box: { width: wide, height: wide }, maxLines: 2 }));
    expect(result.fits).toBe(false);
    expect(result.overflowY).toBeCloseTo(1 * 8 * 1.2, 9);
    expect(result.findings.map((f) => [f.code, f.start])).toEqual([['overflow-y', 4]]);
  });

  it('reports ink above the box: stacked accents, with a small line height', () => {
    // Noto Sans: ascent 1.069 em, descent 0.293 em, Ở ink top 0.999 em. With lineHeight 1.2, the
    // baseline is (1.2 - 1.362) / 2 + 1.069 = 0.988 em under the top of the box.
    const tight = fit('Ở', options({ box: { width: wide, height: wide } }));
    expect(tight.fits).toBe(true);
    expect(tight.size).toBe(40);
    expect(tight.overflowY).toBeCloseTo(0.011 * 40, 9);
    expect(tight.findings.map(({ message: _, ...f }) => f)).toEqual([
      { code: 'overflow-y', start: 0, end: 1 },
    ]);
    expect(tight.findings[0]?.message).toMatch(/ink/i);

    const loose = fit('Ở', options({ box: { width: wide, height: wide }, lineHeight: 1.5 }));
    expect(loose.findings).toEqual([]);
    expect(loose.overflowY).toBe(0);
  });

  it('includes the findings of check', () => {
    const result = fit('Hi தமிழ்', options({ box: { width: wide, height: wide } }));
    expect(result.fits).toBe(true);
    expect(result.findings.map((f) => f.code)).toEqual(['missing-glyph']);
  });

  it('fits empty text at maxSize, with no lines', () => {
    expect(fit('', options({ box: { width: 10, height: 10 } }))).toEqual({
      size: 40,
      lines: [],
      fits: true,
      overflowX: 0,
      overflowY: 0,
      findings: [],
    });
  });

  it('rejects bad options', () => {
    const box = { width: 100, height: 100 };
    expect(() => fit('a', options({ box, minSize: 20, maxSize: 10 }))).toThrow(RangeError);
    expect(() => fit('a', options({ box, minSize: 0 }))).toThrow(RangeError);
    expect(() => fit('a', options({ box, maxLines: 0 }))).toThrow(RangeError);
    expect(() => fit('a', options({ box, maxLines: 1.5 }))).toThrow(RangeError);
    expect(() => fit('a', options({ box, lineHeight: 0 }))).toThrow(RangeError);
    expect(() => fit('a', options({ box: { width: 0, height: 10 } }))).toThrow(RangeError);
    // @ts-expect-error: wrong type on purpose.
    expect(() => fit('a', options({ box: undefined }))).toThrow(TypeError);
  });
});
