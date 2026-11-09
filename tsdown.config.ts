import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig[] = defineConfig([
  {
    // The library runs in Node, Bun, Deno and browsers, so it may not use Node APIs.
    entry: { index: 'src/index.ts' },
    format: 'esm',
    platform: 'neutral',
    target: 'es2023',
    dts: true,
    clean: true,
  },
  {
    entry: { cli: 'src/cli/index.ts' },
    format: 'esm',
    platform: 'node',
    target: 'node22',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
]);

export default config;
