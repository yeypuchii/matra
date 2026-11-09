import {
  badBreakFindings,
  hardBreakParagraphs,
  quote,
  shapedFindings,
  sortFindings,
} from '../check/check.ts';
import { internals } from '../font/stack.ts';
import { assertOptions, assertText, checkLang, checkPositive } from '../options.ts';
import type { Finding, FitOptions, FitResult, Line } from '../types.ts';
import { measureRange } from './measure.ts';
import { layoutParagraph, type Overflow, prepareParagraph } from './wrap.ts';

/** The step of the size search, in pixels. */
const STEP = 0.25;
const EPSILON = 1e-9;
const DEFAULT_LINE_HEIGHT = 1.2;

interface Layout {
  size: number;
  lines: Line[];
  overflows: Overflow[];
  fits: boolean;
}

/**
 * The largest size, from `minSize` to `maxSize` in steps of 0.25 px, at which the text fits the
 * box: each line fits the width with no word broken inside (no `emergency` line), the line
 * count is not more than `maxLines`, and line count × size × `lineHeight` fits the height. When
 * no size fits, the result is for `minSize`, with `fits: false`, and `overflowX` and
 * `overflowY` give how far the text goes outside the box, in pixels.
 *
 * Ink is not part of the search: lines are stacked from the top of the box, each with its
 * baseline where CSS puts it (half the leading above the ascent), and ink above the top or
 * below the bottom of the box gives an `overflow-y` finding and counts in `overflowY`, even
 * when `fits` is true.
 *
 * `findings` has the findings of `check` too.
 */
export function fit(text: string, options: FitOptions): FitResult {
  assertText(text, 'fit');
  assertOptions(options, 'fit');
  const stack = internals(options.fonts);
  const lang = checkLang(options.lang);
  const box = options.box as FitOptions['box'] | undefined;
  if (typeof box !== 'object' || box === null) {
    throw new TypeError('matra: fit() needs `box: { width, height }`.');
  }
  const width = checkPositive(box.width, 'box.width');
  const height = checkPositive(box.height, 'box.height');
  const minSize = checkPositive(options.minSize, 'minSize');
  const maxSize = checkPositive(options.maxSize, 'maxSize');
  if (maxSize < minSize) throw new RangeError('matra: `maxSize` must not be less than `minSize`.');
  const maxLines = options.maxLines;
  if (maxLines !== undefined && (!Number.isInteger(maxLines) || maxLines < 1)) {
    throw new RangeError('matra: `maxLines` must be an integer, 1 or more.');
  }
  const lineHeight = checkPositive(options.lineHeight ?? DEFAULT_LINE_HEIGHT, 'lineHeight');

  const paragraphSpans = hardBreakParagraphs(text);
  const paragraphs = paragraphSpans.map((p) => prepareParagraph(stack, text, lang, p));

  const layoutAt = (size: number): Layout => {
    const lines: Line[] = [];
    const overflows: Overflow[] = [];
    for (const p of paragraphs) {
      const result = layoutParagraph(p, size, width);
      lines.push(...result.lines);
      overflows.push(...result.overflows);
    }
    const fitsWidth = overflows.length === 0;
    const fitsCount = maxLines === undefined || lines.length <= maxLines;
    const fitsHeight = lines.length * size * lineHeight <= height + EPSILON;
    return { size, lines, overflows, fits: fitsWidth && fitsCount && fitsHeight };
  };

  // Binary search over minSize + k × STEP, k = 0..steps, after maxSize itself.
  let chosen = layoutAt(maxSize);
  if (!chosen.fits) {
    const steps = Math.floor((maxSize - minSize) / STEP + EPSILON);
    const atMin = layoutAt(minSize);
    chosen = atMin;
    if (atMin.fits) {
      let lo = 0; // fits
      let hi = steps + 1; // maxSize: does not fit
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        const layout = layoutAt(minSize + mid * STEP);
        if (layout.fits) {
          lo = mid;
          chosen = layout;
        } else {
          hi = mid;
        }
      }
    }
  }

  const { size, lines, overflows } = chosen;
  const findings: Finding[] = badBreakFindings(text, lang, paragraphSpans);
  for (const p of paragraphs) findings.push(...shapedFindings(stack, text, p.items));

  // Width.
  let overflowX = 0;
  for (const o of overflows) {
    overflowX = Math.max(overflowX, o.width - width);
    findings.push({
      code: 'overflow-x',
      start: o.start,
      end: o.end,
      message: `${quote(text, o.start, o.end)} is ${px(o.width - width)} px wider than the box (${px(width)} px) at ${px(size)} px, and has no break point inside.`,
    });
  }

  // Lines: the height and maxLines.
  const lineBox = size * lineHeight;
  const room = Math.min(
    maxLines ?? Number.POSITIVE_INFINITY,
    Math.floor(height / lineBox + EPSILON),
  );
  // The height that the lines need beyond the box, or the height of the lines beyond maxLines.
  let overflowY = Math.max(
    0,
    lines.length * lineBox - height,
    maxLines === undefined ? 0 : (lines.length - maxLines) * lineBox,
  );
  if (lines.length > room) {
    const first = lines[room] as Line;
    const last = lines.at(-1) as Line;
    findings.push({
      code: 'overflow-y',
      start: first.start,
      end: trimEnd(text, first.start, last.end),
      message: `The text needs ${lines.length} lines at ${px(size)} px; the box has room for ${room}${maxLines !== undefined && maxLines === room ? ' (maxLines)' : ''}.`,
    });
  }

  // Ink of the lines in the box.
  const shown = Math.min(lines.length, room);
  for (let i = 0; i < shown; i++) {
    const line = lines[i] as Line;
    const p = paragraphs.find((q) => line.start >= q.start && line.start < q.end);
    if (!p || p.items.length === 0) continue;
    const m = measureRange(stack, text, p.items, size, line.start, line.end);
    if (m.inkTop === 0 && m.inkBottom === 0) continue;
    const baseline = i * lineBox + (lineBox - (m.ascent + m.descent)) / 2 + m.ascent;
    const above = m.inkTop - baseline;
    const below = baseline + m.inkBottom - height;
    const out = Math.max(above, below);
    if (out <= EPSILON) continue;
    overflowY = Math.max(overflowY, out);
    findings.push({
      code: 'overflow-y',
      start: line.start,
      end: trimEnd(text, line.start, line.end),
      message: `Ink goes ${px(out)} px ${above >= below ? 'above the top' : 'below the bottom'} of the box at ${px(size)} px (for example stacked accents). A larger lineHeight gives it room.`,
    });
  }

  return {
    size,
    lines,
    fits: chosen.fits,
    overflowX,
    overflowY,
    findings: sortFindings(findings),
  };
}

/** A number of pixels for a message: at most two decimals. */
function px(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** The end of start..end without line breaks and spaces at its end. */
function trimEnd(text: string, start: number, end: number): number {
  let e = end;
  while (e > start && /\s/.test(text[e - 1] ?? '')) e--;
  return e;
}
