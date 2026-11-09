import { notImplemented } from '../errors.ts';
import type { Segment, SegmentOptions } from '../types.ts';

/** Split the text into graphemes, words, sentences or orthographic syllables. */
// biome-ignore lint/correctness/noUnusedFunctionParameters: a stub until 0.1.0.
export function segment(text: string, options: SegmentOptions): Segment[] {
  return notImplemented('segment()', '0.1.0');
}
