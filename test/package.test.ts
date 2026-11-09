import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

describe('package.json', () => {
  it('has the scoped name, published as a public package', () => {
    // npm refused the plain name "matra" (too close to "metro" and "matea2"). A scoped package
    // is private unless it says otherwise, so publishConfig makes `npm publish` public.
    expect(pkg.name).toBe('@yeypuchi/matra');
    expect(pkg.publishConfig).toEqual({ access: 'public' });
  });

  it('names the CLI with a bin path that npm publish keeps (fault)', () => {
    // npm 11.19 `npm publish` drops a bin whose path starts with "./" ("script name ... was
    // invalid and removed"), although `npm pack` keeps it. The package then has no `matra` command.
    expect(pkg.bin).toEqual({ matra: 'dist/cli.js' });
    for (const target of Object.values(pkg.bin)) expect(target).not.toMatch(/^\.\//);
  });
});
