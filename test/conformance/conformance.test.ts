// Unicode conformance: GraphemeBreakTest, WordBreakTest and LineBreakTest for the Unicode version
// of the runtime. Every difference must be in known-differences.json, with a reason; a listed
// case that now passes must be taken out. To rebuild the lists: pnpm conformance:update.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  dataFile,
  findDifferences,
  hasData,
  KINDS,
  parseBreakTest,
  readKnownDifferences,
  runtimeUnicodeVersion,
} from './unicode.ts';

const version = runtimeUnicodeVersion();
const known = readKnownDifferences();

describe(`Unicode ${version} conformance`, () => {
  it('has the test files for the Unicode version of the runtime', () => {
    expect(
      hasData(version),
      `No Unicode ${version} test files. Add them to test/conformance/files.json and run ` +
        '`pnpm fixtures`.',
    ).toBe(true);
    expect(
      known.unicode,
      'known-differences.json is for another Unicode version. Run `pnpm conformance:update` ' +
        'and review the changes.',
    ).toBe(version);
  });

  it('gives a reason for each known difference', () => {
    for (const kind of KINDS) {
      for (const group of known.differences[kind]) {
        expect(group.reason, `${kind}: ${group.cause}`).not.toMatch(/^TODO|^\s*$/);
      }
    }
  });

  it.runIf(hasData(version)).each(KINDS)(
    '%s breaks match, apart from the known differences',
    (kind) => {
      const cases = parseBreakTest(readFileSync(dataFile(version, kind), 'utf8'));
      expect(cases.length).toBeGreaterThan(100);
      const found = findDifferences(kind, cases);
      const listed = new Map<number, string>();
      for (const group of known.differences[kind]) {
        for (const line of group.cases) listed.set(line, group.cause);
      }
      const unexpected = [...found].filter(([line]) => !listed.has(line));
      const fixed = [...listed].filter(([line]) => !found.has(line));
      const moved = [...found].filter(
        ([line, cause]) => listed.has(line) && listed.get(line) !== cause,
      );
      const show = (entries: [number, string][]) =>
        entries.slice(0, 10).map(([line, cause]) => `line ${line} (${cause})`);
      expect(show(unexpected), 'new differences: fix them, or run pnpm conformance:update').toEqual(
        [],
      );
      expect(show(fixed), 'these cases pass now: run pnpm conformance:update').toEqual([]);
      expect(show(moved), 'the cause changed: run pnpm conformance:update').toEqual([]);
    },
  );
});
