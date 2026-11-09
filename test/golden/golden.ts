// Golden files: for each Tier 1 language, the strings in fixtures/text/golden-<lang>.txt and
// what matra gives for them: findings, lines at fixed widths, and a fit. The test recomputes
// them and compares; `pnpm golden:update` writes them. Used by golden.test.ts and by
// scripts/update-golden.ts.

import { readFileSync } from 'node:fs';
import { check, type Finding, type FontStack, fit, loadFonts, wrap } from '../../src/index.ts';
import { FONTS, type FontName, fontBytes } from '../helpers/fonts.ts';

/** The M1 languages, with the font stack for each (font 0 first). */
export const LANGUAGES: Record<string, FontName[]> = {
  en: ['latin'],
  nl: ['latin'],
  de: ['latin'],
  fr: ['latin'],
  pl: ['latin'],
  tr: ['latin'],
  vi: ['latin'],
  el: ['latin'],
  ru: ['latin'],
  sr: ['latin'],
  uk: ['latin'],
  hi: ['devanagari', 'latin'],
  mr: ['devanagari', 'latin'],
  bn: ['bengali', 'latin'],
  ta: ['tamil', 'latin'],
};

/** The same settings for every language. */
export const SETTINGS = {
  /** wrap: size and widths, in pixels. */
  size: 16,
  widths: [80, 160, 320],
  /** fit: the box and the size limits, in pixels. lineHeight is the default, 1.2. */
  box: { width: 240, height: 96 },
  minSize: 8,
  maxSize: 48,
} as const;

type GoldenFinding = { code: Finding['code']; start: number; end: number; font?: number };

export interface GoldenCase {
  text: string;
  findings: GoldenFinding[];
  /** For each width: [start, end, width, reason] of each line. */
  lines: Record<string, [number, number, number, string][]>;
  fit: {
    size: number;
    fits: boolean;
    overflowX: number;
    overflowY: number;
    lines: [number, number][];
    findings: [string, number, number][];
  };
}

export interface GoldenFile {
  lang: string;
  fonts: string[];
  settings: typeof SETTINGS;
  cases: GoldenCase[];
}

export function inputFile(lang: string): URL {
  return new URL(`../../fixtures/text/golden-${lang}.txt`, import.meta.url);
}

export function goldenFile(lang: string): URL {
  return new URL(`./${lang}.json`, import.meta.url);
}

/** The strings of a language: one on each line of its input file. */
export function readInputs(lang: string): string[] {
  const lines = readFileSync(inputFile(lang), 'utf8').split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

/** Numbers in golden files have three decimals, so that tiny float noise does not matter. */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function brief(f: Finding): GoldenFinding {
  return f.font === undefined
    ? { code: f.code, start: f.start, end: f.end }
    : { code: f.code, start: f.start, end: f.end, font: f.font };
}

export async function fontsFor(lang: string): Promise<FontStack> {
  const names = LANGUAGES[lang];
  if (!names) throw new Error(`No golden settings for "${lang}".`);
  return loadFonts(names.map(fontBytes));
}

export function computeCase(text: string, lang: string, fonts: FontStack): GoldenCase {
  const lines: GoldenCase['lines'] = {};
  for (const width of SETTINGS.widths) {
    lines[String(width)] = wrap(text, { fonts, lang, size: SETTINGS.size, width }).map((l) => [
      l.start,
      l.end,
      round(l.width),
      l.reason,
    ]);
  }
  const fitted = fit(text, {
    fonts,
    lang,
    box: SETTINGS.box,
    minSize: SETTINGS.minSize,
    maxSize: SETTINGS.maxSize,
  });
  return {
    text,
    findings: check(text, { fonts, lang }).map(brief),
    lines,
    fit: {
      size: fitted.size,
      fits: fitted.fits,
      overflowX: round(fitted.overflowX),
      overflowY: round(fitted.overflowY),
      lines: fitted.lines.map((l) => [l.start, l.end]),
      findings: fitted.findings.map((f) => [f.code, f.start, f.end]),
    },
  };
}

export async function computeGolden(lang: string): Promise<GoldenFile> {
  const fonts = await fontsFor(lang);
  return {
    lang,
    fonts: (LANGUAGES[lang] ?? []).map((name) => FONTS[name]),
    settings: SETTINGS,
    cases: readInputs(lang).map((text) => computeCase(text, lang, fonts)),
  };
}
