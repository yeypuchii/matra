import { describe, expect, it } from 'vitest';
import { NotImplementedError } from '../src/errors.ts';
import * as matra from '../src/index.ts';

// The stubs never read the stack, so an empty object stands in for one.
const fonts = { length: 0 } as matra.FontStack;

describe('public API', () => {
  it('exports exactly the documented functions', () => {
    expect(Object.keys(matra).sort()).toEqual([
      'check',
      'fit',
      'loadFonts',
      'measure',
      'segment',
      'shape',
      'wrap',
    ]);
  });
});

// M0: every function is a stub. Each test below is replaced when its milestone item lands.
describe('M0 stubs', () => {
  const calls: [string, () => unknown][] = [
    ['check', () => matra.check('a', { fonts, lang: 'en' })],
    ['segment', () => matra.segment('a', { lang: 'en', unit: 'grapheme' })],
    ['measure', () => matra.measure('a', { fonts, lang: 'en', size: 16 })],
    ['wrap', () => matra.wrap('a', { fonts, lang: 'en', size: 16, width: 100 })],
    [
      'fit',
      () =>
        matra.fit('a', {
          fonts,
          lang: 'en',
          box: { width: 100, height: 100 },
          minSize: 8,
          maxSize: 32,
        }),
    ],
  ];

  it.each(calls)('%s throws NotImplementedError', (name, call) => {
    expect(call).toThrow(NotImplementedError);
    expect(call).toThrow(`${name}()`);
  });
});
