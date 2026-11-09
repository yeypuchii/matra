import type { FontBytes, FontInput, FontStack } from '../types.ts';
import { detectFormat } from './format.ts';
import { type HB, loadHarfBuzz } from './harfbuzz.ts';
import { createStack, LoadedFont } from './stack.ts';

/**
 * Load fonts for the other functions. The order is the priority: font 0 is tried first.
 * Takes TTF, OTF, TTC and WOFF2 bytes. Async, because the HarfBuzz WASM must start. All other
 * functions are sync.
 */
export async function loadFonts(fonts: (FontBytes | FontInput)[]): Promise<FontStack> {
  if (!Array.isArray(fonts)) {
    throw new TypeError('matra: loadFonts() takes an array of fonts.');
  }
  if (fonts.length === 0) {
    throw new TypeError('matra: loadFonts() needs at least one font.');
  }
  const inputs = fonts.map(readInput);
  const hb = await loadHarfBuzz();
  const loaded: LoadedFont[] = [];
  for (const [i, input] of inputs.entries()) {
    loaded.push(await loadOne(hb, input.bytes, input.index, i));
  }
  return createStack(hb, loaded);
}

function readInput(font: FontBytes | FontInput, i: number): { bytes: Uint8Array; index: number } {
  const isInput = typeof font === 'object' && font !== null && !isBytes(font) && 'data' in font;
  const data = isInput ? font.data : font;
  if (!isBytes(data)) {
    throw new TypeError(
      `matra: font ${i} must be a Uint8Array, an ArrayBuffer, or { data, index }.`,
    );
  }
  const index = isInput ? (font.index ?? 0) : 0;
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`matra: font ${i} has index ${index}. It must be an integer, 0 or more.`);
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return { bytes, index };
}

function isBytes(value: unknown): value is FontBytes {
  return value instanceof Uint8Array || value instanceof ArrayBuffer;
}

async function loadOne(hb: HB, bytes: Uint8Array, index: number, i: number): Promise<LoadedFont> {
  let format = detectFormat(bytes);
  if (format.kind === 'woff2') {
    bytes = await decodeWoff2(bytes, i);
    format = detectFormat(bytes);
  }
  switch (format.kind) {
    case 'woff':
      throw new TypeError(
        `matra: font ${i} is WOFF 1. WOFF 1 is not supported. Use the TTF, OTF or WOFF2 file.`,
      );
    case 'unknown':
    case 'woff2':
      throw new TypeError(`matra: font ${i} is not a font file (TTF, OTF, TTC or WOFF2).`);
    case 'collection':
      if (index >= format.numFonts) {
        throw new RangeError(
          `matra: font ${i} has index ${index}, but the collection has ${format.numFonts} fonts.`,
        );
      }
      break;
    case 'sfnt':
      if (index !== 0) {
        throw new RangeError(
          `matra: font ${i} has index ${index}, but it is not a font collection (TTC).`,
        );
      }
      break;
  }
  // The Blob copies the bytes into the WASM memory, so the caller may reuse its array.
  const face = new hb.Face(new hb.Blob(bytes), index);
  // HarfBuzz makes an empty face from bytes it cannot read. Every font has a 'head' table.
  if (!face.referenceTable('head')) {
    throw new TypeError(`matra: font ${i} is not a font file (TTF, OTF, TTC or WOFF2).`);
  }
  return new LoadedFont(face, new hb.Font(face));
}

async function decodeWoff2(bytes: Uint8Array, i: number): Promise<Uint8Array> {
  // Imported only when needed: most callers never give WOFF2, and the decoder is large.
  const { default: decompress } = await import('wawoff2/decompress.js');
  try {
    return new Uint8Array(await decompress(bytes));
  } catch (error) {
    throw new TypeError(`matra: font ${i} is not a valid WOFF2 file.`, { cause: error });
  }
}
