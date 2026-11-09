import type { Face, Font } from 'harfbuzzjs';
import type { FontStack } from '../types.ts';
import type { HB } from './harfbuzz.ts';

const DOTTED_CIRCLE = 0x25cc;

/** One font of a stack, with the HarfBuzz objects and the values that matra reads often. */
export class LoadedFont {
  readonly face: Face;
  readonly font: Font;
  /** Font units per em. */
  readonly upem: number;
  /** Above the baseline, in font units. Positive. */
  readonly ascent: number;
  /** Below the baseline, in font units. Positive. */
  readonly descent: number;
  /** The glyph of U+25CC DOTTED CIRCLE, or undefined when the font has none. */
  readonly dottedCircle: number | undefined;
  readonly #glyphs = new Map<number, number | undefined>();

  constructor(face: Face, font: Font) {
    this.face = face;
    this.font = font;
    this.upem = face.upem;
    const extents = font.hExtents();
    this.ascent = extents.ascender;
    this.descent = -extents.descender;
    this.dottedCircle = this.glyphFor(DOTTED_CIRCLE);
  }

  /** The nominal glyph for a code point from the cmap, or undefined. */
  glyphFor(codePoint: number): number | undefined {
    if (this.#glyphs.has(codePoint)) return this.#glyphs.get(codePoint);
    const glyph = this.font.nominalGlyph(codePoint);
    this.#glyphs.set(codePoint, glyph);
    return glyph;
  }

  hasCodePoint(codePoint: number): boolean {
    return this.glyphFor(codePoint) !== undefined;
  }

  /**
   * The vertical ink of a glyph, in font units, y up: [top, bottom]. Undefined for a glyph with
   * no ink, such as a space.
   */
  inkOf(glyph: number): readonly [top: number, bottom: number] | undefined {
    if (this.#ink.has(glyph)) return this.#ink.get(glyph);
    const extents = this.font.glyphExtents(glyph);
    const ink: readonly [number, number] | undefined =
      extents && (extents.width !== 0 || extents.height !== 0)
        ? [extents.yBearing, extents.yBearing + extents.height]
        : undefined;
    this.#ink.set(glyph, ink);
    return ink;
  }

  readonly #ink = new Map<number, readonly [number, number] | undefined>();
}

export interface StackInternals {
  readonly hb: HB;
  readonly fonts: readonly LoadedFont[];
}

const stacks = new WeakMap<FontStack, StackInternals>();

export function createStack(hb: HB, fonts: LoadedFont[]): FontStack {
  const stack: FontStack = Object.freeze({ length: fonts.length });
  stacks.set(stack, { hb, fonts });
  return stack;
}

/** The fonts behind a stack. Throws when the stack does not come from `loadFonts()`. */
export function internals(stack: FontStack): StackInternals {
  const found = stacks.get(stack);
  if (!found) throw new TypeError('matra: `fonts` must be a FontStack from loadFonts().');
  return found;
}
