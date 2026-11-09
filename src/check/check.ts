import { notImplemented } from '../errors.ts';
import type { CheckOptions, Finding } from '../types.ts';

/** Find text that will not show correctly in the fonts: missing glyphs, broken clusters, fallback. */
// biome-ignore lint/correctness/noUnusedFunctionParameters: a stub until 0.1.0.
export function check(text: string, options: CheckOptions): Finding[] {
  return notImplemented('check()', '0.1.0');
}
