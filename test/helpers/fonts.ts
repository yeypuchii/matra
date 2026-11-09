// Test helpers: read the fixture fonts, and load font stacks once for each test file.

import { readFileSync } from 'node:fs';
import { type FontStack, loadFonts } from '../../src/index.ts';

export const FONTS = {
  latin: 'NotoSans-Regular.ttf',
  devanagari: 'NotoSansDevanagari-Regular.ttf',
  bengali: 'NotoSansBengali-Regular.ttf',
  tamil: 'NotoSansTamil-Regular.ttf',
  arabic: 'NotoSansArabic-Regular.ttf',
  hebrew: 'NotoSansHebrew-Regular.ttf',
  thai: 'NotoSansThai-Regular.ttf',
  sc: 'NotoSansSC-Regular.otf',
  tc: 'NotoSansTC-Regular.otf',
  jp: 'NotoSansJP-Regular.otf',
} as const;

export type FontName = keyof typeof FONTS;

const bytesCache = new Map<string, Uint8Array>();

/** The bytes of a fixture font. Fails with a hint when `pnpm fixtures` has not run. */
export function fontBytes(name: FontName): Uint8Array {
  const file = FONTS[name];
  let bytes = bytesCache.get(file);
  if (!bytes) {
    try {
      bytes = readFileSync(new URL(`../../fixtures/fonts/${file}`, import.meta.url));
    } catch {
      throw new Error(`Missing fixtures/fonts/${file}. Run \`pnpm fixtures\` first.`);
    }
    bytesCache.set(file, bytes);
  }
  return bytes;
}

/** Load a stack of fixture fonts, in priority order. */
export function stack(...names: FontName[]): Promise<FontStack> {
  return loadFonts(names.map(fontBytes));
}

/**
 * Build a font collection (TTC) from single fonts. Each font keeps its own tables; nothing is
 * shared. Layout: the TTC header, then one table directory for each font, then the tables.
 */
export function makeTtc(fonts: Uint8Array[]): Uint8Array {
  const parsed = fonts.map((font) => {
    const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
    const numTables = view.getUint16(4);
    const tables = Array.from({ length: numTables }, (_, i) => {
      const record = 12 + 16 * i;
      return {
        tag: view.getUint32(record),
        checksum: view.getUint32(record + 4),
        data: font.subarray(
          view.getUint32(record + 8),
          view.getUint32(record + 8) + view.getUint32(record + 12),
        ),
      };
    });
    return { sfntVersion: view.getUint32(0), header: font.subarray(4, 12), tables };
  });

  const pad4 = (n: number) => (n + 3) & ~3;
  const headerSize = 12 + 4 * fonts.length;
  const directorySizes = parsed.map((p) => 12 + 16 * p.tables.length);
  let size = headerSize + directorySizes.reduce((a, b) => a + b, 0);
  const tableOffsets: number[][] = parsed.map((p) =>
    p.tables.map((t) => {
      const at = size;
      size += pad4(t.data.length);
      return at;
    }),
  );

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x74746366); // 'ttcf'
  view.setUint32(4, 0x00010000); // version 1.0
  view.setUint32(8, fonts.length);
  let directory = headerSize;
  parsed.forEach((p, f) => {
    view.setUint32(12 + 4 * f, directory);
    view.setUint32(directory, p.sfntVersion);
    out.set(p.header, directory + 4);
    p.tables.forEach((t, i) => {
      const record = directory + 12 + 16 * i;
      const offset = tableOffsets[f]?.[i] ?? 0;
      view.setUint32(record, t.tag);
      view.setUint32(record + 4, t.checksum);
      view.setUint32(record + 8, offset);
      view.setUint32(record + 12, t.data.length);
      out.set(t.data, offset);
    });
    directory += directorySizes[f] ?? 0;
  });
  return out;
}
