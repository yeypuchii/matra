import { assertOptions, assertText, checkLang } from '../options.ts';
import type { Segment, SegmentOptions, SegmentUnit } from '../types.ts';
import { segmenter } from './intl.ts';
import { syllableBoundaries } from './syllables.ts';

const UNITS: readonly SegmentUnit[] = ['grapheme', 'word', 'sentence', 'syllable'];

/**
 * Split text into graphemes, words, sentences or syllables. The segments cover the whole text:
 * words include the spaces and punctuation between them as segments of their own.
 *
 * Graphemes, words and sentences come from `Intl.Segmenter` with the `lang` tag. Syllables are
 * the orthographic syllables of Devanagari, Bengali and Tamil; other text is split into
 * graphemes.
 */
export function segment(text: string, options: SegmentOptions): Segment[] {
  assertText(text, 'segment');
  assertOptions(options, 'segment');
  const lang = checkLang(options.lang);
  const { unit } = options;
  if (!UNITS.includes(unit)) {
    throw new TypeError(`matra: \`unit\` must be one of ${UNITS.join(', ')}.`);
  }
  if (unit === 'syllable') {
    const boundaries = syllableBoundaries(text, lang);
    return boundaries.slice(1).map((end, i) => ({ start: boundaries[i] as number, end }));
  }
  const segments: Segment[] = [];
  for (const s of segmenter(lang, unit).segment(text)) {
    segments.push({ start: s.index, end: s.index + s.segment.length });
  }
  return segments;
}
