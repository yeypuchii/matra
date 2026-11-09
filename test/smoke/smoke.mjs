// Smoke test of the built package (dist/). Plain JavaScript, so it runs unchanged on
// Node, Bun and Deno. Run `pnpm build` first.
//   node test/smoke/smoke.mjs
//   bun test/smoke/smoke.mjs
//   deno run --allow-read test/smoke/smoke.mjs
//
// M0: the package loads and has the documented API. From M1, it also runs a golden subset.

import * as matra from '../../dist/index.js';

const runtime =
  typeof globalThis.Deno !== 'undefined'
    ? `deno ${globalThis.Deno.version.deno}`
    : typeof globalThis.Bun !== 'undefined'
      ? `bun ${globalThis.Bun.version}`
      : `node ${globalThis.process.version}`;

const expected = ['check', 'fit', 'loadFonts', 'measure', 'segment', 'shape', 'wrap'];
const actual = Object.keys(matra).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `smoke (${runtime}): exports are ${actual.join(', ')}; expected ${expected.join(', ')}`,
  );
}
for (const [name, value] of Object.entries(matra)) {
  if (typeof value !== 'function') {
    throw new Error(`smoke (${runtime}): ${name} is not a function`);
  }
}

console.log(`smoke ok (${runtime})`);
