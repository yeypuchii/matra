import { isNeutral } from '../font/runs.ts';
import { internals, type StackInternals } from '../font/stack.ts';
import { assertOptions, assertText, checkLang } from '../options.ts';
import { type ShapedItem, shapeItems } from '../shape/shape.ts';
import type { CheckOptions, Finding, FindingCode } from '../types.ts';

const DOTTED_CIRCLE = 0x25cc;

/** The order of findings that start at the same offset. */
const CODE_ORDER: readonly FindingCode[] = [
  'missing-glyph',
  'broken-cluster',
  'font-fallback',
  'overflow-x',
  'overflow-y',
  'bad-break',
];

/** What `glyphFindings` needs to know about the font of an item. */
export interface FontFacts {
  readonly dottedCircle: number | undefined;
  hasCodePoint(codePoint: number): boolean;
}

/**
 * Find text that will not show correctly. Each line of the input (split at mandatory breaks:
 * newlines and the line and paragraph separators) is checked as a text of its own, because
 * renderers shape each line on its own.
 */
export function check(text: string, options: CheckOptions): Finding[] {
  assertText(text, 'check');
  assertOptions(options, 'check');
  const stack = internals(options.fonts);
  const lang = checkLang(options.lang);
  const findings: Finding[] = [];
  for (const [start, contentEnd] of hardBreakParagraphs(text)) {
    findings.push(
      ...shapedFindings(stack, text, shapeItems(stack, text, lang, undefined, start, contentEnd)),
    );
  }
  return sortFindings(findings);
}

/** The glyph findings and the font-fallback findings of shaped items. Not sorted. */
export function shapedFindings(
  stack: StackInternals,
  text: string,
  items: readonly ShapedItem[],
): Finding[] {
  const findings: Finding[] = [];
  let fallback: Finding | undefined;
  for (const item of items) {
    const font = stack.fonts[item.font];
    if (font) findings.push(...glyphFindings(text, item, font));
    if (item.font === 0) {
      fallback = undefined;
    } else if (fallback && fallback.font === item.font && fallback.end === item.start) {
      fallback.end = item.end;
    } else {
      fallback = {
        code: 'font-fallback',
        start: item.start,
        end: item.end,
        message: '',
        font: item.font,
      };
      findings.push(fallback);
    }
  }
  for (const finding of findings) {
    if (finding.code === 'font-fallback') {
      finding.message = `${quote(text, finding.start, finding.end)} uses font ${finding.font}, not font 0.`;
    }
  }
  return findings;
}

/**
 * The missing-glyph and broken-cluster findings of one shaped item.
 *
 * - missing-glyph: glyph 0 in a cluster with a code point that the font does not have.
 * - broken-cluster: the dotted-circle glyph in a cluster whose input has no U+25CC; or, for a
 *   font with no dotted circle, glyph 0 in a cluster whose code points the font has.
 *
 * Clusters of neutral code points only (controls, default ignorables) are skipped.
 */
export function glyphFindings(text: string, item: ShapedItem, font: FontFacts): Finding[] {
  const clusters = [...new Set(item.glyphs.map((g) => g.cluster))].sort((a, b) => a - b);
  const findings: Finding[] = [];
  for (const [k, start] of clusters.entries()) {
    const end = clusters[k + 1] ?? item.end;
    const glyphs = item.glyphs.filter((g) => g.cluster === start);
    const codePoints = codePointsOf(text, start, end);
    const visible = codePoints.filter((cp) => !isNeutral(cp));
    if (visible.length === 0) continue;
    const missing = visible.filter((cp) => !font.hasCodePoint(cp));

    const hasNotdef = glyphs.some((g) => g.id === 0);
    const inserted =
      font.dottedCircle !== undefined &&
      glyphs.some((g) => g.id === font.dottedCircle) &&
      !codePoints.includes(DOTTED_CIRCLE);

    if (hasNotdef && missing.length > 0) {
      const last = findings.at(-1);
      if (last && last.code === 'missing-glyph' && last.end === start) {
        last.end = end;
      } else {
        findings.push({ code: 'missing-glyph', start, end, message: '', font: item.font });
      }
    } else if (inserted || (hasNotdef && font.dottedCircle === undefined)) {
      findings.push({
        code: 'broken-cluster',
        start,
        end,
        message: `${quote(text, start, end)} (${codes(codePointsOf(text, start, end))}) has no valid base, so it shows with a dotted circle (◌).`,
        font: item.font,
      });
    }
  }
  for (const finding of findings) {
    if (finding.code !== 'missing-glyph') continue;
    const missing = [
      ...new Set(
        codePointsOf(text, finding.start, finding.end).filter(
          (cp) => !isNeutral(cp) && !font.hasCodePoint(cp),
        ),
      ),
    ];
    finding.message = `No font in the stack has glyphs for all of ${quote(text, finding.start, finding.end)}. Missing in font ${finding.font}: ${codes(missing)}.`;
  }
  return findings;
}

/**
 * Split text at mandatory breaks (UAX #14 classes BK, CR, LF and NL). Each entry is
 * [start, contentEnd, end]: the line text is start..contentEnd, and the break characters are
 * contentEnd..end. The last entry ends at text.length; it is empty when the text ends in a
 * break.
 */
export function hardBreakParagraphs(text: string): [number, number, number][] {
  if (text.length === 0) return [];
  const paragraphs: [number, number, number][] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x0d) {
      const end = text.charCodeAt(i + 1) === 0x0a ? i + 2 : i + 1;
      paragraphs.push([start, i, end]);
      start = end;
      i = end - 1;
    } else if (
      c === 0x0a ||
      c === 0x0b ||
      c === 0x0c ||
      c === 0x85 ||
      c === 0x2028 ||
      c === 0x2029
    ) {
      paragraphs.push([start, i, i + 1]);
      start = i + 1;
    }
  }
  paragraphs.push([start, text.length, text.length]);
  return paragraphs;
}

export function sortFindings(findings: Finding[]): Finding[] {
  return findings.sort(
    (a, b) =>
      a.start - b.start || CODE_ORDER.indexOf(a.code) - CODE_ORDER.indexOf(b.code) || a.end - b.end,
  );
}

function codePointsOf(text: string, start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; ) {
    const cp = text.codePointAt(i) as number;
    result.push(cp);
    i += cp > 0xffff ? 2 : 1;
  }
  return result;
}

const MAX_CODES = 6;

function codes(codePoints: number[]): string {
  const shown = codePoints
    .slice(0, MAX_CODES)
    .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
  const more = codePoints.length - MAX_CODES;
  return more > 0 ? `${shown.join(', ')} and ${more} more` : shown.join(', ');
}

const MAX_QUOTE = 24;

/** The text from start to end in quotes, cut at MAX_QUOTE UTF-16 code units. */
export function quote(text: string, start: number, end: number): string {
  if (end - start <= MAX_QUOTE) return JSON.stringify(text.slice(start, end));
  let cut = start + MAX_QUOTE;
  const c = text.charCodeAt(cut - 1);
  if (c >= 0xd800 && c <= 0xdbff) cut--; // Do not cut a surrogate pair.
  return `${JSON.stringify(text.slice(start, cut)).slice(0, -1)}…"`;
}
