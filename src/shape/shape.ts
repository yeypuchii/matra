import { notImplemented } from '../errors.ts';
import type { GlyphRun, ShapeOptions } from '../types.ts';

/** Shape the text with HarfBuzz, one run for each font that the text needs. */
// biome-ignore lint/correctness/noUnusedFunctionParameters: a stub until 0.1.0.
export function shape(text: string, options: ShapeOptions): GlyphRun[] {
  return notImplemented('shape()', '0.1.0');
}
