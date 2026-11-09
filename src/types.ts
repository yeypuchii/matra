// Public types. Offsets are UTF-16 indexes into the input string. Sizes are in pixels.

/** The bytes of a font file: TTF, OTF, TTC or WOFF2. */
export type FontBytes = Uint8Array | ArrayBuffer;

/** A font file, and for a collection (TTC) the index of the font in it. */
export interface FontInput {
  data: FontBytes;
  /** The font in a TTC. Default: 0. */
  index?: number;
}

/** Fonts made by `loadFonts()`. Font 0 has the highest priority. */
export interface FontStack {
  /** The number of fonts in the stack. */
  readonly length: number;
}

/**
 * - `missing-glyph`: no font in the stack has a glyph for the text (tofu).
 * - `broken-cluster`: HarfBuzz inserted a dotted circle, because a mark has no valid base.
 * - `font-fallback`: a run uses a font that is not the first font in the stack.
 * - `overflow-x`, `overflow-y`: the text does not fit the box. `overflow-y` includes ink
 *   outside the line, for example stacked accents.
 * - `bad-break`: a line break in the input is inside a grapheme or a syllable.
 */
export type FindingCode =
  | 'missing-glyph'
  | 'broken-cluster'
  | 'font-fallback'
  | 'overflow-x'
  | 'overflow-y'
  | 'bad-break';

export interface Finding {
  code: FindingCode;
  start: number;
  end: number;
  message: string;
  /** The index of the font in the stack, when the finding is about one font. */
  font?: number;
}

export interface Glyph {
  /** The glyph id in the font. */
  id: number;
  /** The UTF-16 offset of the cluster that the glyph belongs to. */
  cluster: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

/** Glyphs from one font, for the text from `start` to `end`. */
export interface GlyphRun {
  /** The index of the font in the stack. */
  font: number;
  start: number;
  end: number;
  glyphs: Glyph[];
}

export type SegmentUnit = 'grapheme' | 'word' | 'sentence' | 'syllable';

export interface Segment {
  start: number;
  end: number;
}

export interface Metrics {
  width: number;
  ascent: number;
  descent: number;
  inkTop: number;
  inkBottom: number;
}

/**
 * - `mandatory`: the input has a line break here.
 * - `opportunity`: a break point allowed by the line-breaking rules.
 * - `emergency`: a unit wider than the line, broken at a grapheme boundary.
 */
export type LineBreakReason = 'mandatory' | 'opportunity' | 'emergency';

export interface Line {
  start: number;
  end: number;
  width: number;
  reason: LineBreakReason;
}

export interface FitResult {
  /** The largest size that fits, or `minSize` when nothing fits. */
  size: number;
  lines: Line[];
  fits: boolean;
  overflowX: number;
  overflowY: number;
  findings: Finding[];
}

export interface CheckOptions {
  fonts: FontStack;
  /** A BCP 47 language tag. */
  lang: string;
}

export interface ShapeOptions {
  fonts: FontStack;
  lang: string;
  /** OpenType features in HarfBuzz syntax, for example `'liga=0'`. */
  features?: string[];
}

export interface SegmentOptions {
  lang: string;
  unit: SegmentUnit;
}

export interface MeasureOptions {
  fonts: FontStack;
  lang: string;
  size: number;
}

export interface WrapOptions {
  fonts: FontStack;
  lang: string;
  size: number;
  width: number;
}

export interface FitOptions {
  fonts: FontStack;
  lang: string;
  box: { width: number; height: number };
  minSize: number;
  maxSize: number;
  maxLines?: number;
  /** A multiple of the font size. Default: 1.2. */
  lineHeight?: number;
}
