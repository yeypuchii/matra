import { graphemeBoundaries } from '../segment/intl.ts';
import { NEUTRAL_SCRIPT, scriptOf } from './script.ts';
import type { LoadedFont } from './stack.ts';

/** A piece of text that HarfBuzz shapes in one buffer: one font and one script. */
export interface Item {
  start: number;
  end: number;
  /** The index of the font in the stack. */
  font: number;
  /** An ISO 15924 code, or `NEUTRAL_SCRIPT` when the text has only common characters. */
  script: string;
}

// Code points that choose neither the font nor the script: default ignorables (ZWJ, ZWNJ,
// variation selectors, ...), controls (tab, newline) and the line and paragraph separators.
// Renderers do not draw them with a glyph from the font.
const NEUTRAL = /^[\p{Default_Ignorable_Code_Point}\p{Cc}\p{Zl}\p{Zp}]$/u;
const neutralCache = new Map<number, boolean>();

export function isNeutral(codePoint: number): boolean {
  let neutral = neutralCache.get(codePoint);
  if (neutral === undefined) {
    neutral = NEUTRAL.test(String.fromCodePoint(codePoint));
    neutralCache.set(codePoint, neutral);
  }
  return neutral;
}

/**
 * Split text into items. For each grapheme, the font is the first font whose cmap has all its
 * code points, except the neutral ones; when no font has them, font 0. The script is the script
 * of its first code point that is not Common or Inherited. A grapheme with no font or no script
 * of its own takes them from the grapheme before it (at the start: from the one after it).
 * Neighbor graphemes with the same font and script form one item.
 */
export function itemize(fonts: readonly LoadedFont[], text: string, lang: string): Item[] {
  const bounds = graphemeBoundaries(text, lang);
  const count = bounds.length - 1;
  const graphemeFont: (number | undefined)[] = new Array(count);
  const graphemeScript: (string | undefined)[] = new Array(count);
  const codePoints: number[] = [];

  for (let g = 0; g < count; g++) {
    const end = bounds[g + 1] as number;
    let script: string | undefined;
    codePoints.length = 0;
    for (let i = bounds[g] as number; i < end; ) {
      const cp = text.codePointAt(i) as number;
      i += cp > 0xffff ? 2 : 1;
      if (isNeutral(cp)) continue;
      codePoints.push(cp);
      if (script === undefined) {
        const sc = scriptOf(cp);
        if (sc !== NEUTRAL_SCRIPT) script = sc;
      }
    }
    graphemeScript[g] = script;
    if (codePoints.length > 0) {
      const found = fonts.findIndex((font) => codePoints.every((cp) => font.hasCodePoint(cp)));
      graphemeFont[g] = found === -1 ? 0 : found;
    }
  }

  fillGaps(graphemeFont, 0);
  fillGaps(graphemeScript, NEUTRAL_SCRIPT);

  const items: Item[] = [];
  for (let g = 0; g < count; g++) {
    const font = graphemeFont[g] as number;
    const script = graphemeScript[g] as string;
    const last = items.at(-1);
    if (last && last.font === font && last.script === script) {
      last.end = bounds[g + 1] as number;
    } else {
      items.push({ start: bounds[g] as number, end: bounds[g + 1] as number, font, script });
    }
  }
  return items;
}

/** Fill each undefined entry from the entry before it; leading ones from the first defined one. */
function fillGaps<T>(values: (T | undefined)[], fallback: T): void {
  const first = values.find((v) => v !== undefined) ?? fallback;
  let previous = first;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value === undefined) values[i] = previous;
    else previous = value;
  }
}
