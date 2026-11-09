import { notImplemented } from '../errors.ts';
import type { FitOptions, FitResult } from '../types.ts';

/** Find the largest size from `minSize` to `maxSize` at which the text fits the box. */
// biome-ignore lint/correctness/noUnusedFunctionParameters: a stub until 0.1.0.
export function fit(text: string, options: FitOptions): FitResult {
  return notImplemented('fit()', '0.1.0');
}
