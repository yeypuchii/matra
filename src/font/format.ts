// Font file formats, from the first bytes of the file (the OpenType and WOFF specifications).

export type FontFormat =
  | { kind: 'sfnt' }
  | { kind: 'collection'; numFonts: number }
  | { kind: 'woff2' }
  | { kind: 'woff' }
  | { kind: 'unknown' };

const TAG_TRUE_TYPE = 0x00010000;
const TAG_OTTO = 0x4f54544f; // 'OTTO': CFF outlines
const TAG_TRUE = 0x74727565; // 'true': old Apple TrueType
const TAG_TTCF = 0x74746366; // 'ttcf'
const TAG_WOFF = 0x774f4646; // 'wOFF'
const TAG_WOFF2 = 0x774f4632; // 'wOF2'

export function detectFormat(bytes: Uint8Array): FontFormat {
  if (bytes.length < 12) return { kind: 'unknown' };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  switch (view.getUint32(0)) {
    case TAG_TRUE_TYPE:
    case TAG_OTTO:
    case TAG_TRUE:
      return { kind: 'sfnt' };
    case TAG_TTCF:
      return { kind: 'collection', numFonts: view.getUint32(8) };
    case TAG_WOFF2:
      return { kind: 'woff2' };
    case TAG_WOFF:
      return { kind: 'woff' };
    default:
      return { kind: 'unknown' };
  }
}
