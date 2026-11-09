import { notImplemented } from '../errors.ts';
import type { FontBytes, FontInput, FontStack } from '../types.ts';

/**
 * Load fonts for the other functions. The order is the priority: font 0 is tried first.
 * Async, because the HarfBuzz WASM must start. All other functions are sync.
 */
export async function loadFonts(fonts: (FontBytes | FontInput)[]): Promise<FontStack> {
  return notImplemented(`loadFonts() for ${fonts.length} font(s)`, '0.1.0');
}
