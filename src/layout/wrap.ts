import { notImplemented } from '../errors.ts';
import type { Line, WrapOptions } from '../types.ts';

/** Break the text into lines that fit the width, at break points legal for the language. */
// biome-ignore lint/correctness/noUnusedFunctionParameters: a stub until 0.1.0.
export function wrap(text: string, options: WrapOptions): Line[] {
  return notImplemented('wrap()', '0.1.0');
}
