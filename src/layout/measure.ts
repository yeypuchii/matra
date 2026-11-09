import { isNeutral } from '../font/runs.ts';
import { internals, type StackInternals } from '../font/stack.ts';
import { assertOptions, assertText, checkLang, checkPositive } from '../options.ts';
import { type ShapedItem, shapeItems } from '../shape/shape.ts';
import type { MeasureOptions, Metrics } from '../types.ts';

/**
 * Measure the text as one line, in pixels.
 *
 * - `width`: the sum of the x advances.
 * - `ascent`, `descent`: the largest ascender and descender (from the hhea or OS/2 table, by
 *   HarfBuzz) of the fonts that the text uses. Both positive.
 * - `inkTop`, `inkBottom`: how far the ink of the glyphs goes above and below the baseline,
 *   with the y offsets of marks. Positive above and below; negative when the ink does not
 *   reach the baseline. Zero when there is no ink.
 *
 * Control characters (newline, tab) and default ignorables get no width and no ink, because
 * renderers do not draw them.
 */
export function measure(text: string, options: MeasureOptions): Metrics {
  assertText(text, 'measure');
  assertOptions(options, 'measure');
  const stack = internals(options.fonts);
  const lang = checkLang(options.lang);
  const size = checkPositive(options.size, 'size');
  return measureRange(stack, text, shapeItems(stack, text, lang, undefined), size);
}

/**
 * Measure the glyphs of shaped items whose cluster is in from..to. The ascent and descent come
 * from the fonts of the items that overlap from..to; with no such item, from font 0.
 */
export function measureRange(
  stack: StackInternals,
  text: string,
  items: readonly ShapedItem[],
  size: number,
  from = 0,
  to: number = text.length,
): Metrics {
  let width = 0;
  let ascent = Number.NEGATIVE_INFINITY;
  let descent = Number.NEGATIVE_INFINITY;
  let top = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  for (const item of items) {
    if (item.end <= from || item.start >= to) continue;
    const font = stack.fonts[item.font];
    if (!font) continue;
    const scale = size / font.upem;
    ascent = Math.max(ascent, font.ascent * scale);
    descent = Math.max(descent, font.descent * scale);
    const hidden = neutralClusters(text, item);
    for (const glyph of item.glyphs) {
      if (glyph.cluster < from || glyph.cluster >= to || hidden.has(glyph.cluster)) continue;
      width += glyph.xAdvance * scale;
      const ink = font.inkOf(glyph.id);
      if (ink) {
        top = Math.max(top, (ink[0] + glyph.yOffset) * scale);
        bottom = Math.min(bottom, (ink[1] + glyph.yOffset) * scale);
      }
    }
  }
  if (ascent === Number.NEGATIVE_INFINITY) {
    const font0 = stack.fonts[0];
    const scale = font0 ? size / font0.upem : 0;
    ascent = (font0?.ascent ?? 0) * scale;
    descent = (font0?.descent ?? 0) * scale;
  }
  const hasInk = top !== Number.NEGATIVE_INFINITY;
  return {
    width,
    ascent,
    descent,
    // `|| 0` turns -0 into 0.
    inkTop: hasInk ? top || 0 : 0,
    inkBottom: hasInk ? -bottom || 0 : 0,
  };
}

const neutralCache = new WeakMap<ShapedItem, Set<number>>();

/** The clusters of an item that hold only neutral code points (controls, default ignorables). */
export function neutralClusters(text: string, item: ShapedItem): Set<number> {
  let found = neutralCache.get(item);
  if (found) return found;
  found = new Set();
  const starts = [...new Set(item.glyphs.map((g) => g.cluster))].sort((a, b) => a - b);
  for (const [k, start] of starts.entries()) {
    const end = starts[k + 1] ?? item.end;
    let neutral = true;
    for (let i = start; i < end && neutral; ) {
      const cp = text.codePointAt(i) as number;
      neutral = isNeutral(cp);
      i += cp > 0xffff ? 2 : 1;
    }
    if (neutral) found.add(start);
  }
  neutralCache.set(item, found);
  return found;
}
