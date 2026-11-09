import { notImplemented } from '../errors.ts';
import type { MeasureOptions, Metrics } from '../types.ts';

/** Measure the advance width and the ink extents of the text on one line. */
// biome-ignore lint/correctness/noUnusedFunctionParameters: a stub until 0.1.0.
export function measure(text: string, options: MeasureOptions): Metrics {
  return notImplemented('measure()', '0.1.0');
}
