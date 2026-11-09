// Download the test data and check the SHA-256 of each file:
//   fixtures/fonts.json         → fixtures/fonts/          (the test fonts)
//   test/conformance/files.json → test/conformance/data/   (the Unicode break tests)
// Usage: pnpm fixtures
// A file that is already there with the right hash is not downloaded again.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

interface Entry {
  file: string;
  url: string;
  sha256: string;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const MANIFESTS: { manifest: string; key: string; outDir: string }[] = [
  { manifest: 'fixtures/fonts.json', key: 'fonts', outDir: 'fixtures/fonts' },
  { manifest: 'test/conformance/files.json', key: 'files', outDir: 'test/conformance/data' },
];
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

async function fetchEntry(entry: Entry, outDir: string): Promise<'present' | 'downloaded'> {
  const target = path.join(outDir, entry.file);
  const existing = await readIfPresent(target);
  if (existing && sha256(existing) === entry.sha256) return 'present';

  const data = await download(entry.url);
  const actual = sha256(data);
  if (actual !== entry.sha256) {
    throw new Error(`SHA-256 mismatch\n  expected ${entry.sha256}\n  actual   ${actual}`);
  }
  await mkdir(path.dirname(target), { recursive: true });
  const partial = `${target}.part`;
  await writeFile(partial, data);
  await rename(partial, target);
  return 'downloaded';
}

let failed = 0;
let total = 0;
for (const { manifest, key, outDir } of MANIFESTS) {
  const entries = (
    JSON.parse(await readFile(path.join(root, manifest), 'utf8')) as Record<string, Entry[]>
  )[key] as Entry[];
  const dir = path.join(root, outDir);
  await mkdir(dir, { recursive: true });
  const results = await Promise.allSettled(entries.map((e) => fetchEntry(e, dir)));
  results.forEach((result, i) => {
    total++;
    const name = `${outDir}/${entries[i]?.file}`;
    if (result.status === 'fulfilled') {
      console.log(`${result.value.padEnd(10)} ${name}`);
    } else {
      failed++;
      console.error(`FAILED     ${name}: ${(result.reason as Error).message}`);
    }
  });
}
if (failed > 0) {
  console.error(`\n${failed} of ${total} files failed.`);
  process.exitCode = 1;
}
