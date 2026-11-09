// Intl.Segmenter, with one instance for each language and unit.

export type Granularity = 'grapheme' | 'word' | 'sentence';

const segmenters = new Map<string, Intl.Segmenter>();

export function segmenter(lang: string, granularity: Granularity): Intl.Segmenter {
  const key = `${granularity} ${lang}`;
  let found = segmenters.get(key);
  if (!found) {
    found = new Intl.Segmenter(lang, { granularity });
    segmenters.set(key, found);
  }
  return found;
}

/** The boundaries between graphemes, including 0 and text.length (for non-empty text). */
export function graphemeBoundaries(text: string, lang: string): number[] {
  const boundaries: number[] = [];
  for (const { index } of segmenter(lang, 'grapheme').segment(text)) boundaries.push(index);
  if (text.length > 0) boundaries.push(text.length);
  return boundaries;
}
