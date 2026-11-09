import type * as HarfBuzz from 'harfbuzzjs';

export type HB = typeof HarfBuzz;

let pending: Promise<HB> | undefined;

/**
 * Start the HarfBuzz WASM on first use. harfbuzzjs starts its WASM when the module is imported,
 * so a dynamic import keeps `import 'matra'` cheap until the first `loadFonts()`.
 */
export function loadHarfBuzz(): Promise<HB> {
  if (!pending) {
    pending = import('harfbuzzjs').catch((error: unknown) => {
      pending = undefined; // Let a later call try again.
      throw new Error('matra: the HarfBuzz WASM did not start.', { cause: error });
    });
  }
  return pending;
}
