// The Unicode break tests (GraphemeBreakTest, WordBreakTest, LineBreakTest): parse them, run
// them against matra, and sort each difference by its cause. Used by conformance.test.ts and by
// scripts/update-conformance.ts.

import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { LineBreaker } from 'linebreak';
import { segment } from '../../src/index.ts';
import { lineBreakOpportunities } from '../../src/layout/breaks.ts';

export type Kind = 'grapheme' | 'word' | 'line';
export const KINDS: readonly Kind[] = ['grapheme', 'word', 'line'];

export const FILES: Record<Kind, string> = {
  grapheme: 'GraphemeBreakTest.txt',
  word: 'WordBreakTest.txt',
  line: 'LineBreakTest.txt',
};

export interface BreakCase {
  /** The line in the test file, from 1. */
  line: number;
  text: string;
  /** The expected breaks, as UTF-16 offsets, without offset 0. */
  breaks: number[];
  /** The offset of each ÷ or × mark, in order. */
  positions: number[];
  /** The rule of each mark, from the comment, for example "999.0". */
  rules: string[];
  /** The class of each character, from the comment, for example "AL" or "SA_Mn". */
  classes: string[];
}

export interface KnownDifferences {
  unicode: string;
  differences: Record<Kind, { cause: string; reason: string; cases: number[] }[]>;
}

/** The Unicode version of the runtime, as x.y.z. */
export function runtimeUnicodeVersion(): string {
  const version = process.versions.unicode ?? '';
  const parts = version.split('.');
  while (parts.length < 3) parts.push('0');
  return parts.join('.');
}

export function dataFile(version: string, kind: Kind): URL {
  return new URL(`./data/${version}/${FILES[kind]}`, import.meta.url);
}

export const knownDifferencesFile: URL = new URL('./known-differences.json', import.meta.url);

export function readKnownDifferences(): KnownDifferences {
  return JSON.parse(readFileSync(knownDifferencesFile, 'utf8')) as KnownDifferences;
}

export function hasData(version: string): boolean {
  return KINDS.every((kind) => existsSync(dataFile(version, kind)));
}

export function parseBreakTest(source: string): BreakCase[] {
  const cases: BreakCase[] = [];
  for (const [i, raw] of source.split('\n').entries()) {
    const hash = raw.indexOf('#');
    const data = (hash === -1 ? raw : raw.slice(0, hash)).trim();
    if (data === '') continue;
    const comment = hash === -1 ? '' : raw.slice(hash + 1);
    let text = '';
    const breaks: number[] = [];
    const positions: number[] = [];
    for (const token of data.split(/\s+/)) {
      if (token === '÷' || token === '×') {
        positions.push(text.length);
        if (token === '÷' && text.length > 0) breaks.push(text.length);
      } else {
        text += String.fromCodePoint(Number.parseInt(token, 16));
      }
    }
    const rules = [...comment.matchAll(/\[([\d.]+)\]/g)].map((m) => m[1] as string);
    // The class of a character is the last parenthesis before the next ÷ or × mark.
    const classes = [...comment.matchAll(/\(([^()]*)\)\s*[÷×]/g)].map((m) => m[1] as string);
    cases.push({ line: i + 1, text, breaks, positions, rules, classes });
  }
  return cases;
}

/** matra's breaks for the text, without offset 0. */
export function actualBreaks(kind: Kind, text: string): number[] {
  if (kind === 'line') return lineBreakOpportunities(text, 'und').map((b) => b.position);
  return segment(text, { lang: 'und', unit: kind }).map((s) => s.end);
}

/** The cases where matra differs from the test file, each with its cause. */
export function findDifferences(kind: Kind, cases: readonly BreakCase[]): Map<number, string> {
  const found = new Map<number, string>();
  for (const c of cases) {
    const actual = new Set(actualBreaks(kind, c.text));
    const expected = new Set(c.breaks);
    const at = c.positions.findIndex((p) => p > 0 && expected.has(p) !== actual.has(p));
    if (at === -1) continue;
    found.set(c.line, kind === 'line' ? lineCause(c, at) : `rule ${c.rules[at] ?? '?'}`);
  }
  return found;
}

/**
 * Why matra's line breaks differ at the mark `at`. Either matra's own rule removed a break that
 * UAX #14 allows (no break inside a grapheme), or linebreak 2.0.0 differs from Unicode 17.
 */
function lineCause(c: BreakCase, at: number): string {
  const position = c.positions[at] as number;
  const expected = c.breaks.includes(position);
  const raw = new LineBreaker(c.text);
  let linebreakBreaks = false;
  for (let b = raw.nextBreak(); b; b = raw.nextBreak()) {
    if (b.position === position) linebreakBreaks = true;
  }
  if (linebreakBreaks === expected) {
    const graphemes = segment(c.text, { lang: 'und', unit: 'grapheme' }).map((s) => s.end);
    return graphemes.includes(position) ? 'matra: inside a syllable' : 'matra: inside a grapheme';
  }

  // Classes are like "AL", "SA_Mn" or "OP_EastAsian" (East Asian width F, W or H); "m" means
  // "minus": "OPmEastAsian" is an OP that is not East Asian.
  const classes = c.classes.join(' ');
  const rule = c.rules[at] ?? '?';
  const next = c.classes[at] ?? '';
  let back = at - 1;
  while (back > 0 && /^(CM|ZWJ)/.test(c.classes[back] ?? '')) back--;
  const before = c.classes[back] ?? '';
  back--;
  while (back > 0 && /^(CM|ZWJ)/.test(c.classes[back] ?? '')) back--;
  const beforeThat = c.classes[back] ?? '';

  if (/\b(AK|AP|AS|VI|VF)\b/.test(classes)) return 'linebreak: aksara';
  if (rule === '20.1') return 'linebreak: word-initial hyphen';
  if (
    /^15\.[12]|^19\./.test(rule) ||
    /^QU/.test(next) ||
    (rule === '18.0' && /\bQU/.test(classes))
  ) {
    return 'linebreak: quotation marks';
  }
  if (/_ExtPictUnassigned/.test(classes)) return 'linebreak: unassigned extended pictographic';
  if (/\bSA_M[nc]\b/.test(classes)) return 'linebreak: SA marks';
  if (/_EastAsian/.test(classes)) return 'linebreak: East Asian width';
  if (/^HL/.test(beforeThat) && /^(HY|HH|BA)/.test(before)) {
    return 'linebreak: Hebrew letter and hyphen';
  }
  if (
    rule === '15.3' ||
    /^25\./.test(rule) ||
    (/^(SY|CL|CP|PR|PO|NU)/.test(before) && /^(NU|PR|PO|OP)/.test(next))
  ) {
    return 'linebreak: numbers';
  }
  return `linebreak: rule ${rule}`;
}
