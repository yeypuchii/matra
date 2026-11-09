// Write test/conformance/known-differences.json: every case of the Unicode break tests where
// matra differs, grouped by cause. Reasons already in the file are kept; a new cause gets a
// TODO reason, and the conformance test fails until a person writes the reason.
// Usage: pnpm conformance:update   (run `pnpm fixtures` first)

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  dataFile,
  findDifferences,
  hasData,
  KINDS,
  type KnownDifferences,
  knownDifferencesFile,
  parseBreakTest,
  readKnownDifferences,
  runtimeUnicodeVersion,
} from '../test/conformance/unicode.ts';

const version = runtimeUnicodeVersion();
if (!hasData(version)) {
  console.error(
    `No Unicode ${version} test files in test/conformance/data/. Add them to ` +
      'test/conformance/files.json and run `pnpm fixtures`.',
  );
  process.exit(1);
}

let previous: KnownDifferences | undefined;
try {
  previous = readKnownDifferences();
} catch {
  previous = undefined;
}

const result: KnownDifferences = {
  unicode: version,
  differences: { grapheme: [], word: [], line: [] },
};
for (const kind of KINDS) {
  const cases = parseBreakTest(readFileSync(dataFile(version, kind), 'utf8'));
  const byCause = new Map<string, number[]>();
  for (const [line, cause] of findDifferences(kind, cases)) {
    byCause.set(cause, [...(byCause.get(cause) ?? []), line]);
  }
  for (const [cause, lines] of [...byCause].sort(([a], [b]) => a.localeCompare(b))) {
    const reason =
      previous?.differences[kind].find((g) => g.cause === cause)?.reason ??
      `TODO: explain why matra differs here (${kind}, ${cause}).`;
    result.differences[kind].push({ cause, reason, cases: lines.sort((a, b) => a - b) });
  }
  const counts = result.differences[kind].map((g) => `${g.cause}: ${g.cases.length}`);
  console.log(`${kind}: ${cases.length} cases, differences ${counts.join(', ') || 'none'}`);
}
writeFileSync(knownDifferencesFile, `${JSON.stringify(result, null, 2)}\n`);
console.log('Wrote test/conformance/known-differences.json');
