import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { run } from '../src/cli/run.ts';
import { FONTS } from './helpers/fonts.ts';

async function cli(...argv: string[]) {
  let stdout = '';
  let stderr = '';
  const code = await run(argv, {
    out: (s) => {
      stdout += s;
    },
    err: (s) => {
      stderr += s;
    },
  });
  return { code, stdout, stderr };
}

const fontPath = (name: keyof typeof FONTS) =>
  fileURLToPath(new URL(`../fixtures/fonts/${FONTS[name]}`, import.meta.url));
const latin = fontPath('latin');
const devanagari = fontPath('devanagari');

function tempFile(content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'matra-cli-'));
  const file = path.join(dir, 'strings.txt');
  writeFileSync(file, content);
  return file;
}

describe('matra CLI', () => {
  it('prints the package version', async () => {
    for (const flag of ['--version', '-v']) {
      const r = await cli(flag);
      expect(r).toEqual({ code: 0, stdout: `${pkg.version}\n`, stderr: '' });
    }
  });

  it('prints usage on --help, to stdout, exit 0', async () => {
    for (const argv of [['--help'], ['check', '--help']]) {
      const r = await cli(...argv);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain('matra check --font <file>');
      expect(r.stderr).toBe('');
    }
  });

  it('prints usage to stderr with exit 2 when no command is given', async () => {
    const r = await cli();
    expect(r.code).toBe(2);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('Usage:');
  });

  it('rejects an unknown command with exit 2', async () => {
    const r = await cli('frobnicate');
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('unknown command "frobnicate"');
  });
});

describe('matra check', () => {
  it('exits 0 and says so when there are no findings', async () => {
    const r = await cli('check', '--font', devanagari, '--lang', 'hi', '--text', 'नमस्ते दुनिया');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('No findings');
    expect(r.stderr).toBe('');
  });

  it('exits 1 and prints each finding', async () => {
    const r = await cli('check', '--font', latin, '--lang', 'ta', '--text', 'Hi தமிழ்!');
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('missing-glyph');
    expect(r.stdout).toContain('3–8');
    expect(r.stdout).toContain('1 finding in 1 of 1 string');
  });

  it('takes more than one font, in priority order', async () => {
    const r = await cli(
      'check',
      '--font',
      latin,
      '--font',
      fontPath('bengali'),
      '--lang',
      'bn',
      '--text',
      'Hello বাংলা',
    );
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('font-fallback');
  });

  it('checks each line of a file, with its line number', async () => {
    const file = tempFile('Hello\nHi தமிழ்!\r\n\nबाकी\n');
    const r = await cli('check', '--font', latin, '--lang', 'en', '--file', file);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('line 2');
    expect(r.stdout).not.toContain('line 1');
    expect(r.stdout).toContain('1 finding in 1 of 4 strings');
  });

  it('prints JSON with --json', async () => {
    const file = tempFile('Hello\nHi தமிழ்!\n');
    const r = await cli('check', '--font', latin, '--lang', 'en', '--file', file, '--json');
    expect(r.code).toBe(1);
    const out = JSON.parse(r.stdout);
    expect(out).toMatchObject({
      strings: 2,
      findings: 1,
      results: [{ line: 2, text: 'Hi தமிழ்!', findings: [{ code: 'missing-glyph', start: 3 }] }],
    });
    const clean = await cli('check', '--font', latin, '--lang', 'en', '--text', 'Hi', '--json');
    expect(clean.code).toBe(0);
    expect(JSON.parse(clean.stdout)).toEqual({ strings: 1, findings: 0, results: [] });
  });

  it('exits 2 on a usage error, with the reason on stderr', async () => {
    const cases: [string[], RegExp][] = [
      [['check', '--lang', 'en', '--text', 'a'], /--font/],
      [['check', '--font', latin, '--text', 'a'], /--lang/],
      [['check', '--font', latin, '--lang', 'en'], /--text or --file/],
      [['check', '--font', latin, '--lang', 'en', '--text', 'a', '--file', 'x'], /not both/],
      [['check', '--font', latin, '--lang', 'en', '--text', 'a', '--size', '3'], /--size/],
      [['check', '--font', 'no-such-font.ttf', '--lang', 'en', '--text', 'a'], /no-such-font/],
      [['check', '--font', 'package.json', '--lang', 'en', '--text', 'a'], /not a font file/],
      [['check', '--font', latin, '--lang', 'not a tag', '--text', 'a'], /language tag/],
      [['check', '--font', latin, '--lang', 'en', '--file', 'no-such-file.txt'], /no-such-file/],
    ];
    for (const [argv, message] of cases) {
      const r = await cli(...argv);
      expect({ argv, code: r.code, stdout: r.stdout }).toEqual({ argv, code: 2, stdout: '' });
      expect(r.stderr).toMatch(message);
    }
  });
});
