// Download the test fonts in fixtures/fonts.json into fixtures/fonts/ and check each SHA-256.
// Usage: pnpm fixtures
// A file that is already there with the right hash is not downloaded again.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

interface FontEntry {
  file: string;
  url: string;
  sha256: string;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'fixtures', 'fonts');
const ATTEMPTS = 3;

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

async function readIfPresent(file: string): Promise<Uint8Array | undefined> {
  try {
    return await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function download(url: string): Promise<Uint8Array> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`download failed after ${ATTEMPTS} attempts: ${url}`, { cause: lastError });
}

async function fetchFont(font: FontEntry): Promise<'present' | 'downloaded'> {
  const target = path.join(outDir, font.file);
  const existing = await readIfPresent(target);
  if (existing && sha256(existing) === font.sha256) return 'present';

  const data = await download(font.url);
  const actual = sha256(data);
  if (actual !== font.sha256) {
    throw new Error(`SHA-256 mismatch\n  expected ${font.sha256}\n  actual   ${actual}`);
  }
  const partial = `${target}.part`;
  await writeFile(partial, data);
  await rename(partial, target);
  return 'downloaded';
}

const manifest = JSON.parse(await readFile(path.join(root, 'fixtures', 'fonts.json'), 'utf8')) as {
  fonts: FontEntry[];
};
await mkdir(outDir, { recursive: true });

const results = await Promise.allSettled(manifest.fonts.map(fetchFont));
let failed = 0;
results.forEach((result, i) => {
  const file = manifest.fonts[i]?.file;
  if (result.status === 'fulfilled') {
    console.log(`${result.value.padEnd(10)} ${file}`);
  } else {
    failed++;
    console.error(`FAILED     ${file}: ${(result.reason as Error).message}`);
  }
});
if (failed > 0) {
  console.error(`\n${failed} of ${results.length} fonts failed.`);
  process.exitCode = 1;
}
