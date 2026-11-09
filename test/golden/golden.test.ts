// Golden tests: what matra gives for real text in each Tier 1 language. A golden file changes
// only through `pnpm golden:update`, and the commit message says why.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  computeCase,
  fontsFor,
  type GoldenFile,
  goldenFile,
  inputFile,
  LANGUAGES,
  readInputs,
  SETTINGS,
} from './golden.ts';

describe.each(Object.keys(LANGUAGES))('golden: %s', (lang) => {
  it('has an input file and a golden file', () => {
    expect(existsSync(inputFile(lang)), `fixtures/text/golden-${lang}.txt`).toBe(true);
    expect(existsSync(goldenFile(lang)), `test/golden/${lang}.json: run pnpm golden:update`).toBe(
      true,
    );
  });

  it('matches the golden file', async () => {
    const golden = JSON.parse(readFileSync(goldenFile(lang), 'utf8')) as GoldenFile;
    expect(golden.settings, 'the settings changed: run pnpm golden:update').toEqual(SETTINGS);
    const inputs = readInputs(lang);
    expect(
      golden.cases.map((c) => c.text),
      'the input file changed: run pnpm golden:update',
    ).toEqual(inputs);
    const fonts = await fontsFor(lang);
    for (const expected of golden.cases) {
      expect(computeCase(expected.text, lang, fonts)).toEqual(expected);
    }
  });
});
