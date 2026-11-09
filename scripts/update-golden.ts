// Write test/golden/<lang>.json from fixtures/text/golden-<lang>.txt.
// Usage: pnpm golden:update [lang ...]   (all languages when none is given)
// Say in the commit message why a golden file changed.

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { computeGolden, goldenFile, LANGUAGES } from '../test/golden/golden.ts';

const langs = process.argv.slice(2);
for (const lang of langs.length > 0 ? langs : Object.keys(LANGUAGES)) {
  if (!LANGUAGES[lang]) {
    console.error(
      `No golden settings for "${lang}". Add it to LANGUAGES in test/golden/golden.ts.`,
    );
    process.exit(1);
  }
  const golden = computeGolden(lang);
  const json = `${JSON.stringify(await golden, null, 2)}\n`;
  let before = '';
  try {
    before = readFileSync(goldenFile(lang), 'utf8');
  } catch {
    // A new golden file.
  }
  writeFileSync(goldenFile(lang), json);
  console.log(`${before === '' ? 'new     ' : 'written '} test/golden/${lang}.json`);
}
