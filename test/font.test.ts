import { describe, expect, it } from 'vitest';
import compress from 'wawoff2/compress.js';
import { internals } from '../src/font/stack.ts';
import { type FontStack, loadFonts } from '../src/index.ts';
import { fontBytes, makeTtc } from './helpers/fonts.ts';

const A = 0x61;
const KA_DEVANAGARI = 0x915;
const KA_BENGALI = 0x995;
const KA_TAMIL = 0xb95;

function fontsOf(stack: FontStack) {
  return internals(stack).fonts;
}

describe('loadFonts', () => {
  it('loads a TrueType font from a Uint8Array', async () => {
    const stack = await loadFonts([fontBytes('latin')]);
    expect(stack.length).toBe(1);
    const [font] = fontsOf(stack);
    expect(font?.upem).toBe(1000);
    expect(font?.hasCodePoint(A)).toBe(true);
    expect(font?.hasCodePoint(KA_TAMIL)).toBe(false);
  });

  it('loads a CFF OpenType font', async () => {
    const [font] = fontsOf(await loadFonts([fontBytes('sc')]));
    expect(font?.upem).toBe(1000);
    expect(font?.hasCodePoint(0x4e2d)).toBe(true); // 中
  });

  it('loads from an ArrayBuffer', async () => {
    const bytes = fontBytes('tamil');
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const [font] = fontsOf(await loadFonts([copy as ArrayBuffer]));
    expect(font?.hasCodePoint(KA_TAMIL)).toBe(true);
  });

  it('reads only the bytes of a Uint8Array view, not its whole buffer', async () => {
    const bytes = fontBytes('bengali');
    const big = new Uint8Array(bytes.length + 64);
    big.set(bytes, 32);
    const [font] = fontsOf(await loadFonts([big.subarray(32, 32 + bytes.length)]));
    expect(font?.hasCodePoint(KA_BENGALI)).toBe(true);
  });

  it('keeps the order of the fonts: the order is the priority', async () => {
    const stack = await loadFonts([fontBytes('tamil'), fontBytes('bengali'), fontBytes('latin')]);
    expect(stack.length).toBe(3);
    expect(fontsOf(stack).map((f) => f.hasCodePoint(KA_TAMIL))).toEqual([true, false, false]);
    expect(fontsOf(stack).map((f) => f.hasCodePoint(KA_BENGALI))).toEqual([false, true, false]);
  });

  it('loads a WOFF2 font', async () => {
    const ttf = fontBytes('devanagari');
    const woff2 = await compress(ttf);
    expect(new TextDecoder().decode(woff2.subarray(0, 4))).toBe('wOF2');
    const [fromWoff2] = fontsOf(await loadFonts([woff2]));
    const [fromTtf] = fontsOf(await loadFonts([ttf]));
    expect(fromWoff2?.upem).toBe(fromTtf?.upem);
    expect(fromWoff2?.glyphFor(KA_DEVANAGARI)).toBe(fromTtf?.glyphFor(KA_DEVANAGARI));
  });

  it('rejects WOFF 1 with a clear error', async () => {
    const woff = new Uint8Array(64);
    woff.set(new TextEncoder().encode('wOFF'));
    await expect(loadFonts([woff])).rejects.toThrow(/WOFF 1 is not supported/);
  });

  it('loads each font of a collection (TTC) by its index', async () => {
    const ttc = makeTtc([fontBytes('tamil'), fontBytes('bengali')]);
    const stack = await loadFonts([
      { data: ttc, index: 1 },
      { data: ttc },
      { data: ttc, index: 0 },
    ]);
    expect(fontsOf(stack).map((f) => f.hasCodePoint(KA_BENGALI))).toEqual([true, false, false]);
    expect(fontsOf(stack).map((f) => f.hasCodePoint(KA_TAMIL))).toEqual([false, true, true]);
  });

  it('rejects an index that is not in the collection', async () => {
    const ttc = makeTtc([fontBytes('tamil'), fontBytes('bengali')]);
    await expect(loadFonts([{ data: ttc, index: 2 }])).rejects.toThrow(RangeError);
    await expect(loadFonts([{ data: ttc, index: -1 }])).rejects.toThrow(RangeError);
    await expect(loadFonts([{ data: ttc, index: 0.5 }])).rejects.toThrow(RangeError);
  });

  it('rejects an index other than 0 for a font that is not a collection', async () => {
    await expect(loadFonts([{ data: fontBytes('latin'), index: 1 }])).rejects.toThrow(
      /not a font collection/,
    );
    await expect(loadFonts([{ data: fontBytes('latin'), index: 0 }])).resolves.toHaveLength(1);
  });

  it('rejects bytes that are not a font', async () => {
    await expect(loadFonts([new TextEncoder().encode('hello, world')])).rejects.toThrow(
      /font 0 is not a font file/,
    );
    await expect(loadFonts([fontBytes('latin'), new Uint8Array(3)])).rejects.toThrow(
      /font 1 is not a font file/,
    );
    const otto = new Uint8Array(256);
    otto.set(new TextEncoder().encode('OTTO'));
    await expect(loadFonts([otto])).rejects.toThrow(/font 0 is not a font file/);
  });

  it('rejects bytes that say WOFF2 but are not', async () => {
    const bad = new Uint8Array(64);
    bad.set(new TextEncoder().encode('wOF2'));
    await expect(loadFonts([bad])).rejects.toThrow(/not a valid WOFF2 file/);
  });

  it('rejects an empty list, and input that is not a list of fonts', async () => {
    await expect(loadFonts([])).rejects.toThrow(TypeError);
    // @ts-expect-error: wrong type on purpose.
    await expect(loadFonts(fontBytes('latin'))).rejects.toThrow(TypeError);
    // @ts-expect-error: wrong type on purpose.
    await expect(loadFonts(['NotoSans-Regular.ttf'])).rejects.toThrow(/font 0/);
  });

  it('does not keep a reference to the caller’s bytes', async () => {
    const bytes = fontBytes('latin').slice();
    const stack = await loadFonts([bytes]);
    bytes.fill(0);
    expect(fontsOf(stack)[0]?.hasCodePoint(A)).toBe(true);
  });
});

describe('a FontStack', () => {
  it('is rejected when it does not come from loadFonts', () => {
    expect(() => internals({ length: 1 })).toThrow(/loadFonts/);
  });
});
