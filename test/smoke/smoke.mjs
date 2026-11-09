// Smoke test of the built package (dist/). Plain JavaScript, so it runs unchanged on
// Node, Bun and Deno. Run `pnpm build` and `pnpm fixtures` first.
//   node test/smoke/smoke.mjs
//   bun test/smoke/smoke.mjs
//   deno run --allow-read test/smoke/smoke.mjs
//
// It checks that the package loads and has the documented API, then runs a golden subset: for
// the first cases of each golden file, the findings and the lines at the first width.

import { readdirSync, readFileSync } from 'node:fs';
import * as matra from '../../dist/index.js';

const runtime =
  typeof globalThis.Deno !== 'undefined'
    ? `deno ${globalThis.Deno.version.deno}`
    : typeof globalThis.Bun !== 'undefined'
      ? `bun ${globalThis.Bun.version}`
      : `node ${globalThis.process.version}`;

function fail(message) {
  throw new Error(`smoke (${runtime}): ${message}`);
}

const expected = ['check', 'fit', 'loadFonts', 'measure', 'segment', 'shape', 'wrap'];
const actual = Object.keys(matra).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail(`exports are ${actual.join(', ')}; expected ${expected.join(', ')}`);
}
for (const [name, value] of Object.entries(matra)) {
  if (typeof value !== 'function') fail(`${name} is not a function`);
}

const CASES_PER_LANGUAGE = 2;
const goldenDir = new URL('../golden/', import.meta.url);
const round = (n) => Math.round(n * 1000) / 1000;
let checked = 0;

for (const name of readdirSync(goldenDir)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const golden = JSON.parse(readFileSync(new URL(name, goldenDir), 'utf8'));
  let bytes;
  try {
    bytes = golden.fonts.map((file) =>
      readFileSync(new URL(`../../fixtures/fonts/${file}`, import.meta.url)),
    );
  } catch {
    fail(`missing fixture fonts for ${golden.lang}. Run \`pnpm fixtures\` first.`);
  }
  const fonts = await matra.loadFonts(bytes);
  const { size, widths } = golden.settings;
  for (const c of golden.cases.slice(0, CASES_PER_LANGUAGE)) {
    const findings = matra
      .check(c.text, { fonts, lang: golden.lang })
      .map((f) =>
        f.font === undefined
          ? { code: f.code, start: f.start, end: f.end }
          : { code: f.code, start: f.start, end: f.end, font: f.font },
      );
    if (JSON.stringify(findings) !== JSON.stringify(c.findings)) {
      fail(`${golden.lang} "${c.text}": findings ${JSON.stringify(findings)}`);
    }
    const width = widths[0];
    const lines = matra
      .wrap(c.text, { fonts, lang: golden.lang, size, width })
      .map((l) => [l.start, l.end, round(l.width), l.reason]);
    if (JSON.stringify(lines) !== JSON.stringify(c.lines[String(width)])) {
      fail(`${golden.lang} "${c.text}": lines at ${width} px ${JSON.stringify(lines)}`);
    }
    checked++;
  }
}
if (checked === 0) fail('no golden cases found in test/golden/');

console.log(`smoke ok (${runtime}): ${checked} golden cases`);
