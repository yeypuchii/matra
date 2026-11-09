// Benchmark check, wrap and fit on a 1,000-character paragraph (fixtures/text/bench-hi.txt).
//
// Usage:
//   pnpm bench           run, and compare with test/bench/baseline.json
//   pnpm bench --save    run, and write the results to test/bench/baseline.json
//
// Run `pnpm fixtures` first. Times depend on the machine, so compare runs on the same machine.
// The `× shape` column divides each time by the time of raw HarfBuzz shaping on the same
// run. That ratio depends much less on the machine.

import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import process from 'node:process';
import * as hb from 'harfbuzzjs';
import { NotImplementedError } from '../../src/errors.ts';
import { check, type FontStack, fit, loadFonts, wrap } from '../../src/index.ts';

const FONT = 'NotoSansDevanagari-Regular.ttf';
const TEXT = 'bench-hi.txt';
const LANG = 'hi';
const SIZE = 16;
const WIDTH = 400;
const WARMUP_MS = 300;
const SAMPLE_MS = 1500;

interface Result {
  medianUs: number;
  p95Us: number;
  opsPerSec: number;
}

interface Baseline {
  recorded: string;
  runtime: string;
  cpu: string;
  harfbuzz: string;
  text: { file: string; utf16Length: number };
  results: Record<string, Result | null>;
}

const baselineUrl = new URL('./baseline.json', import.meta.url);
const fontBytes = await readFile(new URL(`../../fixtures/fonts/${FONT}`, import.meta.url)).catch(
  () => {
    console.error(`Missing fixtures/fonts/${FONT}. Run \`pnpm fixtures\` first.`);
    process.exit(1);
  },
);
const text = (
  await readFile(new URL(`../../fixtures/text/${TEXT}`, import.meta.url), 'utf8')
).trim();

function time(fn: () => unknown): Result {
  const warmupEnd = performance.now() + WARMUP_MS;
  while (performance.now() < warmupEnd) fn();
  const samples: number[] = [];
  const sampleEnd = performance.now() + SAMPLE_MS;
  while (performance.now() < sampleEnd) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const at = (q: number) =>
    samples[Math.min(samples.length - 1, Math.floor(q * samples.length))] ?? 0;
  const medianMs = at(0.5);
  return {
    medianUs: round(medianMs * 1000),
    p95Us: round(at(0.95) * 1000),
    opsPerSec: Math.round(1000 / medianMs),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

// The reference: shape the whole paragraph with HarfBuzz and read the glyphs, nothing else.
const hbFont = new hb.Font(new hb.Face(new hb.Blob(fontBytes)));
function rawShape(): number {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.setLanguage(LANG);
  buffer.guessSegmentProperties();
  hb.shape(hbFont, buffer);
  return buffer.getGlyphInfos().length + buffer.getGlyphPositions().length;
}

let fonts: FontStack | undefined;
try {
  fonts = await loadFonts([fontBytes]);
} catch (error) {
  if (!(error instanceof NotImplementedError)) throw error;
}

const cases: [string, (() => unknown) | undefined][] = [
  ['harfbuzz shape (reference)', rawShape],
  ['check', fonts && (() => check(text, { fonts: fonts as FontStack, lang: LANG }))],
  [
    'wrap',
    fonts &&
      (() => wrap(text, { fonts: fonts as FontStack, lang: LANG, size: SIZE, width: WIDTH })),
  ],
  [
    'fit',
    fonts &&
      (() =>
        fit(text, {
          fonts: fonts as FontStack,
          lang: LANG,
          box: { width: WIDTH, height: 600 },
          minSize: 8,
          maxSize: 32,
        })),
  ],
];

const results: Record<string, Result | null> = {};
for (const [name, fn] of cases) results[name] = fn ? time(fn) : null;

const previous = await readFile(baselineUrl, 'utf8')
  .then((s) => JSON.parse(s) as Baseline)
  .catch(() => undefined);
const reference = results['harfbuzz shape (reference)'];

console.log(`${text.length} UTF-16 code units, ${LANG}, ${FONT}, ${SIZE}px, width ${WIDTH}px`);
console.log(
  `${runtime()}, ${os.cpus()[0]?.model ?? 'unknown CPU'}, HarfBuzz ${hb.versionString()}\n`,
);
console.log(
  `${'case'.padEnd(28)}${'median µs'.padStart(11)}${'p95 µs'.padStart(10)}${'ops/s'.padStart(9)}${'× shape'.padStart(9)}${'vs baseline'.padStart(13)}`,
);
for (const [name, r] of Object.entries(results)) {
  if (!r) {
    console.log(`${name.padEnd(28)}${'not implemented yet'.padStart(30)}`);
    continue;
  }
  const ratio = reference ? (r.medianUs / reference.medianUs).toFixed(1) : '';
  const before = previous?.results[name];
  const change = before
    ? `${(((r.medianUs - before.medianUs) / before.medianUs) * 100).toFixed(0)}%`
    : 'new';
  console.log(
    `${name.padEnd(28)}${String(r.medianUs).padStart(11)}${String(r.p95Us).padStart(10)}${String(r.opsPerSec).padStart(9)}${ratio.padStart(9)}${change.padStart(13)}`,
  );
}
if (previous) console.log(`\nBaseline: ${previous.recorded}, ${previous.runtime}, ${previous.cpu}`);

if (process.argv.includes('--save')) {
  const baseline: Baseline = {
    recorded: new Date().toISOString().slice(0, 10),
    runtime: runtime(),
    cpu: os.cpus()[0]?.model ?? 'unknown CPU',
    harfbuzz: hb.versionString(),
    text: { file: `fixtures/text/${TEXT}`, utf16Length: text.length },
    results,
  };
  await writeFile(baselineUrl, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log('\nSaved test/bench/baseline.json');
}

function runtime(): string {
  return `node ${process.version}`;
}
