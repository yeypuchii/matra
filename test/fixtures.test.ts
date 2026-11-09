import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../fixtures/fonts.json' with { type: 'json' };

const sources = readFileSync(new URL('../fixtures/SOURCES.md', import.meta.url), 'utf8');
const textFiles = readdirSync(new URL('../fixtures/text/', import.meta.url));

describe('fixtures/fonts.json', () => {
  it('lists at least one font', () => {
    expect(manifest.fonts.length).toBeGreaterThan(0);
  });

  it.each(manifest.fonts)('$file is pinned, hashed and OFL-licensed', (font) => {
    expect(font.file).toMatch(/^[A-Za-z0-9-]+\.(ttf|otf|ttc|woff2)$/);
    // The URL must name a commit, so the bytes cannot change under the hash.
    expect(font.url).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//,
    );
    expect(font.url.endsWith(`/${font.file}`)).toBe(true);
    expect(font.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(font.license).toBe('OFL-1.1');
  });

  it('has no duplicate file names', () => {
    const names = manifest.fonts.map((f) => f.file);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('fixtures/SOURCES.md', () => {
  it.each(manifest.fonts.map((f) => f.file))('records the font %s', (file) => {
    expect(sources).toContain(`\`${file}\``);
  });

  it.each(textFiles)('records the text file %s', (file) => {
    expect(sources).toContain(`\`text/${file}\``);
  });
});
