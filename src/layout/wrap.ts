import { hardBreakParagraphs } from '../check/check.ts';
import { isNeutral } from '../font/runs.ts';
import { internals, type StackInternals } from '../font/stack.ts';
import { assertOptions, assertText, checkLang, checkPositive } from '../options.ts';
import { graphemeBoundaries } from '../segment/intl.ts';
import { syllableBoundaries } from '../segment/syllables.ts';
import { type ShapedItem, shapeItems } from '../shape/shape.ts';
import type { Line, WrapOptions } from '../types.ts';
import { lineBreakOpportunities } from './breaks.ts';
import { measureRange, neutralClusters } from './measure.ts';

/** HarfBuzz GlyphFlag.UNSAFE_TO_BREAK. */
const UNSAFE_TO_BREAK = 1;
/** Slack for floating-point sums of advances, in em. */
const EPSILON = 1e-9;
const STARTS_WITH_MARK = /^\p{M}/u;

/**
 * Break text into lines that fit the width, in pixels.
 *
 * Break points come from UAX #14, minus those inside a grapheme or a Brahmic syllable. Each line
 * takes as many words as fit. Spaces at the end of a line hang: they do not count in its
 * width. A word wider than the line breaks between syllables, or between graphemes when one
 * syllable is too wide; such a line has the reason `emergency`. A grapheme wider than the line
 * gets a line of its own, wider than `width`.
 *
 * The lines cover the whole text: the newline at the end of a line belongs to it.
 */
export function wrap(text: string, options: WrapOptions): Line[] {
  assertText(text, 'wrap');
  assertOptions(options, 'wrap');
  const stack = internals(options.fonts);
  const lang = checkLang(options.lang);
  const size = checkPositive(options.size, 'size');
  const width = checkPositive(options.width, 'width');
  const lines: Line[] = [];
  for (const paragraph of hardBreakParagraphs(text)) {
    lines.push(
      ...layoutParagraph(prepareParagraph(stack, text, lang, paragraph), size, width).lines,
    );
  }
  return lines;
}

/**
 * A paragraph, shaped once, with its break points. Shaping does not depend on the size, and
 * every width grows in proportion to the size, so one prepared paragraph serves every size.
 */
export interface PreparedParagraph {
  text: string;
  start: number;
  contentEnd: number;
  end: number;
  items: ShapedItem[];
  /** Widths at size 1 (in em). Undefined for an empty paragraph. */
  layout: ParagraphLayout | undefined;
  breaks: number[];
  units: number[];
  graphemes: number[];
  graphemeSet: Set<number>;
}

/** A word wider than the line: it overflows the width, or gets emergency breaks. */
export interface Overflow {
  start: number;
  end: number;
  /** In pixels. */
  width: number;
}

/** Shape one paragraph, [start, contentEnd, end] from hardBreakParagraphs(), for layout. */
export function prepareParagraph(
  stack: StackInternals,
  text: string,
  lang: string,
  [start, contentEnd, end]: readonly [number, number, number],
): PreparedParagraph {
  if (contentEnd === start) {
    return {
      text,
      start,
      contentEnd,
      end,
      items: [],
      layout: undefined,
      breaks: [],
      units: [],
      graphemes: [],
      graphemeSet: new Set(),
    };
  }
  const items = shapeItems(stack, text, lang, undefined, start, contentEnd);
  const content = text.slice(start, contentEnd);
  const graphemes = graphemeBoundaries(content, lang).map((b) => b + start);
  return {
    text,
    start,
    contentEnd,
    end,
    items,
    layout: new ParagraphLayout(stack, text, lang, items, start, contentEnd),
    breaks: lineBreakOpportunities(content, lang).map((b) => b.position + start),
    units: syllableBoundaries(content, lang).map((b) => b + start),
    graphemes,
    graphemeSet: new Set(graphemes),
  };
}

/** Break a prepared paragraph into lines at a size, for a width in pixels. */
export function layoutParagraph(
  p: PreparedParagraph,
  size: number,
  maxWidthPx: number,
): { lines: Line[]; overflows: Overflow[] } {
  const { text, start, contentEnd, end, layout, breaks, units, graphemes, graphemeSet } = p;
  if (!layout) {
    // An empty line: only the break characters, or nothing at the end of the text.
    const lines: Line[] = end > start ? [{ start, end, width: 0, reason: 'mandatory' }] : [];
    return { lines, overflows: [] };
  }
  const maxWidth = maxWidthPx / size;
  const lines: Line[] = [];
  const overflows: Overflow[] = [];
  const line = (from: number, to: number, reason: Line['reason']): void => {
    lines.push({
      start: from,
      end: to,
      width: layout.width(from, Math.min(to, contentEnd)) * size,
      reason,
    });
  };
  let inWord = false; // true while the lines are pieces of one word wider than the line
  let pos = start;
  while (pos < contentEnd) {
    // The furthest break point where the line still fits.
    let best: number | undefined;
    for (const b of breaks) {
      if (b <= pos) continue;
      if (layout.width(pos, b) > maxWidth + EPSILON) break;
      best = b;
    }
    if (best !== undefined) {
      const last = best === contentEnd;
      line(pos, last ? end : best, last ? 'mandatory' : 'opportunity');
      pos = best;
      inWord = false;
      continue;
    }
    // Nothing fits: the word from pos to the next break point is wider than the line.
    const next = breaks.find((b) => b > pos) ?? contentEnd;
    const wordEnd = layout.trim(pos, next);
    if (!inWord)
      overflows.push({ start: pos, end: wordEnd, width: layout.width(pos, next) * size });
    const cut =
      furthestFit(layout, pos, wordEnd, units, maxWidth) ??
      furthestFit(layout, pos, wordEnd, graphemes, maxWidth) ??
      graphemes.find((g) => g > pos && g < wordEnd);
    if (cut === undefined) {
      // One grapheme, wider than the line: it gets the line, with its spaces.
      const last = next === contentEnd;
      line(pos, last ? end : next, last ? 'mandatory' : 'opportunity');
      pos = next;
      inWord = false;
    } else {
      // Spaces and tabs right after the cut stay on this line, where they hang.
      let stop = cut;
      while (stop < wordEnd && hangs(text.charCodeAt(stop)) && graphemeSet.has(stop + 1)) stop++;
      line(pos, stop, 'emergency');
      pos = stop;
      inWord = true;
    }
  }
  return { lines, overflows };
}

/** The furthest boundary b, pos < b < wordEnd, where pos..b fits the width. */
function furthestFit(
  layout: ParagraphLayout,
  pos: number,
  wordEnd: number,
  boundaries: readonly number[],
  maxWidth: number,
): number | undefined {
  let best: number | undefined;
  for (const b of boundaries) {
    if (b <= pos) continue;
    if (b >= wordEnd) break;
    if (layout.width(pos, b) > maxWidth + EPSILON) break;
    best = b;
  }
  return best;
}

/** Widths of the parts of one shaped paragraph, in em (at size 1). */
export class ParagraphLayout {
  readonly #stack: StackInternals;
  readonly #text: string;
  readonly #lang: string;
  readonly #start: number;
  /** prefix[i - start]: the advance of all glyphs with a cluster before i. */
  readonly #prefix: Float64Array;
  /** Offsets where a line may start or end with the widths of the paragraph shaping. */
  readonly #safe = new Set<number>();
  readonly #reshaped = new Map<string, number>();

  constructor(
    stack: StackInternals,
    text: string,
    lang: string,
    items: readonly ShapedItem[],
    start: number,
    end: number,
  ) {
    this.#stack = stack;
    this.#text = text;
    this.#lang = lang;
    this.#start = start;
    const advance = new Float64Array(end - start);
    const unsafe = new Set<number>();
    for (const item of items) {
      const font = stack.fonts[item.font];
      if (!font) continue;
      const scale = 1 / font.upem;
      const hidden = neutralClusters(text, item);
      for (const glyph of item.glyphs) {
        this.#safe.add(glyph.cluster);
        if (glyph.flags & UNSAFE_TO_BREAK) unsafe.add(glyph.cluster);
        if (hidden.has(glyph.cluster)) continue;
        const at = glyph.cluster - start;
        advance[at] = (advance[at] as number) + glyph.xAdvance * scale;
      }
    }
    for (const offset of unsafe) this.#safe.delete(offset);
    // Items are shaped in separate buffers, so HarfBuzz flags say nothing about the edges
    // between them. And a line that starts with a mark is the beginning of a text when it is
    // shaped on its own: HarfBuzz may insert a dotted circle there. Shape such lines again.
    for (const item of items) this.#safe.delete(item.start);
    for (const offset of this.#safe) {
      if (STARTS_WITH_MARK.test(text.slice(offset, offset + 2))) this.#safe.delete(offset);
    }
    this.#safe.add(start);
    this.#safe.add(end);
    this.#prefix = new Float64Array(end - start + 1);
    for (let i = 0; i < advance.length; i++) {
      this.#prefix[i + 1] = (this.#prefix[i] as number) + (advance[i] as number);
    }
  }

  /** The end of from..to without the spaces and controls at its end, which hang. */
  trim(from: number, to: number): number {
    let end = to;
    while (end > from && hangs(this.#text.charCodeAt(end - 1))) end--;
    return end;
  }

  /** The width of a line from..to, without its hanging end, in em. */
  width(from: number, to: number): number {
    const end = this.trim(from, to);
    if (end === from) return 0;
    if (this.#safe.has(from) && this.#safe.has(to)) {
      return (
        (this.#prefix[end - this.#start] as number) - (this.#prefix[from - this.#start] as number)
      );
    }
    // A break inside a cluster, or one that HarfBuzz marks unsafe: shape the line on its own.
    const key = `${from} ${to}`;
    let width = this.#reshaped.get(key);
    if (width === undefined) {
      const items = shapeItems(this.#stack, this.#text, this.#lang, undefined, from, to);
      width = measureRange(this.#stack, this.#text, items, 1, from, end).width;
      this.#reshaped.set(key, width);
    }
    return width;
  }
}

/** Characters that hang at the end of a line: spaces (not no-break spaces) and controls. */
export function hangs(c: number): boolean {
  return (
    c === 0x20 ||
    c === 0x1680 ||
    (c >= 0x2000 && c <= 0x2006) ||
    (c >= 0x2008 && c <= 0x200a) ||
    c === 0x205f ||
    c === 0x3000 ||
    isNeutral(c)
  );
}
