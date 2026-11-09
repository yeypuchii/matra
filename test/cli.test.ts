import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { run } from '../src/cli/run.ts';

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

describe('matra CLI', () => {
  it('prints the package version', async () => {
    for (const flag of ['--version', '-v']) {
      const r = await cli(flag);
      expect(r).toEqual({ code: 0, stdout: `${pkg.version}\n`, stderr: '' });
    }
  });

  it('prints usage on --help, to stdout, exit 0', async () => {
    const r = await cli('--help');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('matra check --font <file>');
    expect(r.stderr).toBe('');
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

  // M0: replaced by real tests in M1 item 10.
  it('says check is not implemented yet, exit 2', async () => {
    const r = await cli('check', '--font', 'a.ttf', '--lang', 'hi', '--text', 'x');
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('not implemented yet');
  });
});
